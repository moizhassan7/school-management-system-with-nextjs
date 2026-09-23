import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { can, permissionKey } from '@/lib/permissions';
import { generateAdmissionNumber } from '@/lib/admission-number';

const studentSchema = z.object({
  // Ignored when creating — server always auto-generates
  admissionNumber: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionDate: z.string(),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().optional(),
  subjectGroupId: z.string().optional(),
  academicYearId: z.string().optional(),
  academicYear: z
    .object({
      startYear: z.string(),
      stopYear: z.string(),
    })
    .optional(),
  feeStructureItems: z
    .array(
      z.object({
        feeHeadId: z.string(),
        amount: z.number().nonnegative(),
      })
    )
    .optional(),
});

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  username: z.string().min(3).optional().nullable().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  religion: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).optional(),
  schoolId: z.string().optional().or(z.literal('')),
  role: z.nativeEnum(Role).optional(),
  suspended: z.boolean().optional(),
  campusIds: z.array(z.string()).optional(),
  permissionOverrides: z
    .array(
      z.object({
        module: z.string(),
        action: z.string(),
        granted: z.boolean(),
      })
    )
    .optional(),
  student: studentSchema.optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.user, 'USERS', 'VIEW')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = session.user.role;
    const schoolId = session.user.schoolId;
    const where =
      role === 'SUPER_ADMIN' ? { deletedAt: null } : { deletedAt: null, schoolId };

    const users = await prisma.user.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, initials: true } },
        campusAccess: {
          include: { campus: { select: { id: true, name: true } } },
        },
        _count: { select: { userPermissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = userSchema.parse(body);

    const creatingStudent = !!data.student;
    const allowed =
      can(session.user, 'USERS', 'CREATE') ||
      (creatingStudent && can(session.user, 'STUDENTS', 'CREATE'));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const effectiveSchoolId =
      session.user.role === 'SUPER_ADMIN'
        ? data.schoolId || session.user.schoolId || ''
        : session.user.schoolId || data.schoolId || '';

    if (!effectiveSchoolId) {
      return NextResponse.json(
        { error: 'School is required. Select a school or ensure your account has a school assigned.' },
        { status: 400 }
      );
    }

    const role = creatingStudent
      ? Role.STUDENT
      : data.role || Role.STAFF;

    if (role === Role.SUPER_ADMIN && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot create SUPER_ADMIN' }, { status: 403 });
    }

    const rawPassword = data.password?.trim()
      ? data.password.trim()
      : creatingStudent
      ? 'Student@123'
      : 'password123';
    const passwordHash = crypto.createHash('sha256').update(rawPassword).digest('hex');

    let userEmail = data.email?.trim();
    if (!userEmail) {
      const school = await prisma.school.findUnique({
        where: { id: effectiveSchoolId },
        select: { name: true },
      });
      const domain = school?.name
        ? `${school.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        : 'theharvardschools.com';
      const nameSlug =
        data.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.+|\.+$/g, '') || 'student';
      userEmail = `${nameSlug}@${domain}`;
      const existing = await prisma.user.findUnique({ where: { email: userEmail } });
      if (existing) {
        userEmail = `${nameSlug}.${Date.now().toString().slice(-4)}@${domain}`;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name,
          email: userEmail,
          username: data.username ? data.username : null,
          passwordHash,
          phone: data.phone || null,
          address: data.address || null,
          religion: data.religion || null,
          gender: data.gender ?? 'UNSPECIFIED',
          schoolId: effectiveSchoolId,
          role,
          suspended: data.suspended ?? false,
        },
      });

      if (data.campusIds?.length) {
        await tx.campusAccess.createMany({
          data: data.campusIds.map((campusId) => ({
            userId: created.id,
            campusId,
          })),
          skipDuplicates: true,
        });
      }

      if (data.permissionOverrides?.length) {
        const perms = await tx.permission.findMany();
        const byKey = new Map(
          perms.map((p) => [permissionKey(p.module, p.action), p.id])
        );
        for (const o of data.permissionOverrides) {
          const permissionId = byKey.get(permissionKey(o.module, o.action));
          if (!permissionId) continue;
          await tx.userPermission.create({
            data: {
              userId: created.id,
              permissionId,
              granted: o.granted,
            },
          });
        }
      }

      let studentRecord = null;
      if (data.student) {
        const s = data.student;
        if (!s.classId) {
          throw new Error('CLASS_REQUIRED');
        }

        let academicYearId = s.academicYearId;
        const startYear =
          s.academicYear?.startYear ||
          String(new Date(s.admissionDate).getFullYear());

        if (!academicYearId && s.academicYear) {
          const existing = await tx.academicYear.findFirst({
            where: {
              schoolId: effectiveSchoolId,
              startYear: s.academicYear.startYear,
              stopYear: s.academicYear.stopYear,
            },
          });
          if (existing) {
            academicYearId = existing.id;
          } else {
            const createdYear = await tx.academicYear.create({
              data: {
                schoolId: effectiveSchoolId,
                startYear: s.academicYear.startYear,
                stopYear: s.academicYear.stopYear,
              },
            });
            academicYearId = createdYear.id;
          }
        }

        const admissionNumber = await generateAdmissionNumber(
          tx,
          effectiveSchoolId,
          s.classId,
          startYear
        );

        studentRecord = await tx.studentRecord.create({
          data: {
            userId: created.id,
            admissionNumber,
            rollNumber: s.rollNumber || null,
            subjectGroupId: s.subjectGroupId || null,
            admissionDate: new Date(s.admissionDate),
            classId: s.classId,
            sectionId: s.sectionId || null,
          },
        });

        if (academicYearId) {
          await tx.academicYearStudentRecord.create({
            data: {
              academicYearId,
              studentRecordId: studentRecord.id,
              classId: s.classId || null,
              sectionId: s.sectionId || null,
            },
          });
        }

        if (s.feeStructureItems?.length) {
          const sanitizedItems = s.feeStructureItems
            .filter((item) => Number(item.amount) >= 0)
            .map((item) => ({
              feeHeadId: item.feeHeadId,
              amount: Number(item.amount),
            }));

          if (sanitizedItems.length) {
            await tx.studentFeeStructure.create({
              data: {
                studentRecordId: studentRecord.id,
                schoolId: effectiveSchoolId,
                classId: s.classId || null,
                items: { create: sanitizedItems },
              },
            });
          }
        }
      }

      return { ...created, studentRecord };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'CLASS_REQUIRED') {
      return NextResponse.json(
        { error: 'Class is required to create a student' },
        { status: 400 }
      );
    }
    if (
      error instanceof Error &&
      error.message === 'Class is required to generate admission number'
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    if ((error as { code?: string })?.code === 'P2002') {
      const target = (error as { meta?: { target?: string[] } })?.meta?.target;
      if (Array.isArray(target) && target.includes('email')) {
        return NextResponse.json(
          { error: 'User email already exists', field: 'email' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
