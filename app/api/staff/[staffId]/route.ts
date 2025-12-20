import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { staffId } = await params;
    const staff = await prisma.staffRecord.findFirst({
      where: {
        userId: staffId,
        user: { schoolId: session.user.schoolId, deletedAt: null }
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true, address: true } },
        sectionsIncharged: true,
        assignments: true
      }
    });
    if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(staff);
  } catch {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { staffId } = await params;
    const body = await request.json();

    const assignments = Array.isArray(body.assignments) ? body.assignments : [];
    if (assignments.length > 0) {
      const subjectIds = Array.from(new Set(assignments.map((a: any) => a.subjectId))) as string[];
      const classIds = Array.from(new Set(assignments.map((a: any) => a.classId))) as string[];
      const sectionIds = Array.from(new Set(assignments.map((a: any) => a.sectionId).filter(Boolean))) as string[];
      const [subjects, classes, sections] = await Promise.all([
        prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true } }),
        prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true } }),
        prisma.section.findMany({ where: { id: { in: sectionIds as string[] } }, select: { id: true, classId: true } }),
      ]);
      const okSubject = new Set(subjects.map(s => s.id));
      const okClass = new Set(classes.map(c => c.id));
      const okSection = new Map(sections.map(s => [s.id, s.classId]));
      for (const a of assignments) {
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

    const updated = await prisma.$transaction(async (tx) => {
      const staff = await tx.staffRecord.update({
        where: { userId: staffId },
        data: {
          designation: body.designation,
          department: body.department,
          qualification: body.qualification,
          joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
          salary: body.salary,
          employmentType: body.employmentType
        },
        include: { user: true }
      });

      await tx.user.update({
        where: { id: staff.userId },
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          address: body.address,
          role: body.role
        }
      });

      if (assignments.length > 0) {
        await tx.subjectAssignment.deleteMany({ where: { teacherId: staffId } });
        await tx.subjectAssignment.createMany({
          data: assignments.map((a: any) => ({
            teacherId: staffId,
            subjectId: a.subjectId,
            classId: a.classId,
            sectionId: a.sectionId || null
          }))
        });
      }

      if (body.inchargeSectionId) {
        const sec = await tx.section.findUnique({ where: { id: body.inchargeSectionId } });
        if (!sec) {
          throw Object.assign(new Error('Section not found'), { code: 'P2025' });
        }
        await tx.section.update({
          where: { id: body.inchargeSectionId },
          data: { classTeacherId: staffId }
        });
      }

      return staff;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { staffId } = await params;
    const staff = await prisma.staffRecord.findUnique({ where: { userId: staffId }, select: { userId: true } });
    if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.user.update({
      where: { id: staff.userId },
      data: { deletedAt: new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
