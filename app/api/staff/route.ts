import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { hashPassword } from '@/lib/password';
import { stripSecrets } from '@/lib/authz';

// Validation Schema
const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['TEACHER', 'STAFF', 'ACCOUNTANT', 'ADMIN']),
  
  // Staff Details
  designation: z.string().min(1),
  department: z.string().optional(),
  qualification: z.string().optional(),
  joiningDate: z.string(),
  salary: z.number().min(0),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  
  // Assignments (Optional)
  assignments: z.array(z.object({
    subjectId: z.string(),
    classId: z.string(),
    sectionId: z.string().optional(),
  })).optional(),
  
  // Class Incharge (Optional)
  inchargeSectionId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.user, 'TEACHERS', 'VIEW')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get('pageSize') || 25)));
    const q = searchParams.get('q')?.trim() || '';

    const userFilter: Record<string, unknown> = {
      deletedAt: null,
      ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
    };

    const where: Record<string, unknown> = q
      ? {
          user: userFilter,
          OR: [
            { designation: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
            { user: { is: { ...userFilter, name: { contains: q, mode: 'insensitive' } } } },
            { user: { is: { ...userFilter, email: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : { user: userFilter };

    const [total, staff] = await Promise.all([
      prisma.staffRecord.count({ where }),
      prisma.staffRecord.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
          sectionsIncharged: { include: { myClass: true } },
          assignments: {
            include: { subject: true, myClass: true, section: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: staff,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId && session?.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.user, 'TEACHERS', 'CREATE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const data = staffSchema.parse(body);

    if (data.role === 'ADMIN' && !['ADMIN', 'SUPER_ADMIN'].includes(String(session.user.role))) {
      return NextResponse.json({ error: 'Cannot create ADMIN' }, { status: 403 });
    }

    const schoolId = session.user.role === 'SUPER_ADMIN'
      ? session.user.schoolId
      : session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School is required' }, { status: 400 });
    }

    // Prevalidate assignment references to avoid FK rollback
    if (data.assignments && data.assignments.length > 0) {
      const subjectIds = Array.from(new Set(data.assignments.map(a => a.subjectId)));
      const classIds = Array.from(new Set(data.assignments.map(a => a.classId)));
      const sectionIds = Array.from(new Set((data.assignments.map(a => a.sectionId).filter(Boolean) as string[])));
      const [subjects, classes, sections] = await Promise.all([
        prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true } }),
        prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true } }),
        prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, classId: true } }),
      ]);
      const okSubject = new Set(subjects.map(s => s.id));
      const okClass = new Set(classes.map(c => c.id));
      const okSection = new Map(sections.map(s => [s.id, s.classId]));
      for (const a of data.assignments) {
        if (!okSubject.has(a.subjectId) || !okClass.has(a.classId)) {
          return NextResponse.json({ error: 'Invalid subject or class in assignments' }, { status: 400 });
        }
        if (a.sectionId) {
          const cls = okSection.get(a.sectionId);
          if (!cls || cls !== a.classId) {
            return NextResponse.json({ error: 'Section does not belong to selected class' }, { status: 400 });
          }
        }
      }
    }

    const passwordHash = await hashPassword(data.password);

    // Transaction to create User + Staff Record + Assignments
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          phone: data.phone,
          address: data.address,
          role: data.role, // TEACHER or STAFF
          schoolId,
        }
      });

      // 2. Create Staff Record
      const staff = await tx.staffRecord.create({
        data: {
          userId: user.id,
          designation: data.designation,
          department: data.department,
          qualification: data.qualification,
          joiningDate: new Date(data.joiningDate),
          salary: data.salary,
          employmentType: data.employmentType,
        }
      });

      // 3. Handle Subject Assignments (For Teachers)
      if (data.assignments && data.assignments.length > 0) {
        await tx.subjectAssignment.createMany({
          data: data.assignments.map(a => ({
            teacherId: staff.id,
            subjectId: a.subjectId,
            classId: a.classId,
            sectionId: a.sectionId || null
          }))
        });
      }

      // 4. Handle Class Incharge (Update Section)
      if (data.inchargeSectionId) {
        const sec = await tx.section.findUnique({ where: { id: data.inchargeSectionId } });
        if (!sec) {
          throw Object.assign(new Error('Section not found'), { code: 'P2025' });
        }
        await tx.section.update({
          where: { id: data.inchargeSectionId },
          data: { classTeacherId: staff.id }
        });
      }

      return staff;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    if (error?.code === 'P2003') {
      const metaInfo = error?.meta;
      const field = metaInfo?.field_name || metaInfo?.target || 'reference';
      return NextResponse.json({ error: `Invalid ${String(field)} reference` }, { status: 400 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
