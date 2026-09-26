import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { hashPassword } from '@/lib/password';
import { stripSecrets } from '@/lib/authz';
import { can } from '@/lib/permissions';

const VIEW_ROLES = ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF'];

const updateStudentSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).optional(),
  schoolId: z.string().optional(),
  religion: z.string().optional().nullable(),
  classId: z.string().min(1).optional(),
  sectionId: z.string().optional().nullable(),
  subjectGroupId: z.string().optional().nullable(),
  rollNumber: z.string().optional().nullable(),
  admissionDate: z.string().optional(),
  feeStructureItems: z
    .array(
      z.object({
        feeHeadId: z.string().min(1),
        amount: z.coerce.number().nonnegative(),
      })
    )
    .optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    const role = String(session?.user?.role || '');
    const schoolId = session?.user?.schoolId;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!VIEW_ROLES.includes(role) && !can(session.user, 'STUDENTS', 'VIEW')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        studentRecord: {
          include: {
            academicYearRecords: {
              include: { academicYear: true, myClass: true, section: true },
              orderBy: { createdAt: 'desc' },
            },
            myClass: {
              include: {
                classGroup: {
                  include: { campus: true },
                },
              },
            },
            section: true,
            subjectGroup: true,
            feeStructure: {
              include: {
                items: {
                  include: { feeHead: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
            parents: {
              include: {
                parentRecord: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt || !user.studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (role !== 'SUPER_ADMIN' && schoolId && user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(stripSecrets(user));
  } catch (error) {
    console.error('GET Student Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.user, 'STUDENTS', 'EDIT') && !can(session.user, 'USERS', 'EDIT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await params;
    const body = await request.json();
    const data = updateStudentSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { id: studentId },
      include: { studentRecord: true },
    });

    if (!existing || existing.deletedAt || !existing.studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (
      session.user.role !== 'SUPER_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (
      data.schoolId !== undefined &&
      session.user.role !== 'SUPER_ADMIN' &&
      data.schoolId !== existing.schoolId
    ) {
      return NextResponse.json({ error: 'Cannot move student to another school' }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const userData: Record<string, unknown> = {};
      if (data.name !== undefined) userData.name = data.name;
      if (data.email !== undefined) userData.email = data.email;
      if (data.phone !== undefined) userData.phone = data.phone || null;
      if (data.address !== undefined) userData.address = data.address || null;
      if (data.gender !== undefined) userData.gender = data.gender;
      if (data.schoolId !== undefined) userData.schoolId = data.schoolId;
      if (data.religion !== undefined) userData.religion = data.religion || null;
      if (data.password && data.password.length >= 6) {
        userData.passwordHash = await hashPassword(data.password);
      }

      const user = await tx.user.update({
        where: { id: studentId },
        data: userData,
      });

      const recordData: Record<string, unknown> = {};
      if (data.classId !== undefined) recordData.classId = data.classId;
      if (data.sectionId !== undefined) recordData.sectionId = data.sectionId || null;
      if (data.subjectGroupId !== undefined) {
        recordData.subjectGroupId = data.subjectGroupId || null;
      }
      if (data.rollNumber !== undefined) recordData.rollNumber = data.rollNumber || null;
      if (data.admissionDate !== undefined) {
        recordData.admissionDate = new Date(data.admissionDate);
      }

      const studentRecord = await tx.studentRecord.update({
        where: { id: existing.studentRecord!.id },
        data: recordData,
        include: {
          myClass: true,
          section: true,
        },
      });

      if (data.feeStructureItems) {
        const resolvedSchoolId = data.schoolId || existing.schoolId;
        if (!resolvedSchoolId) {
          throw Object.assign(new Error('School is required to save fee structure'), { status: 400 });
        }

        const feeHeadIds = data.feeStructureItems.map((item) => item.feeHeadId);
        if (new Set(feeHeadIds).size !== feeHeadIds.length) {
          throw Object.assign(new Error('Each fee head can only be added once'), { status: 400 });
        }

        if (feeHeadIds.length > 0) {
          const heads = await tx.feeHead.findMany({
            where: { id: { in: feeHeadIds }, schoolId: resolvedSchoolId },
            select: { id: true },
          });
          if (heads.length !== feeHeadIds.length) {
            throw Object.assign(new Error('One or more fee heads do not belong to this school'), {
              status: 400,
            });
          }
        }

        const structure = await tx.studentFeeStructure.upsert({
          where: { studentRecordId: existing.studentRecord!.id },
          create: {
            studentRecordId: existing.studentRecord!.id,
            schoolId: resolvedSchoolId,
            classId: data.classId || existing.studentRecord!.classId,
          },
          update: {
            schoolId: resolvedSchoolId,
            classId: data.classId || existing.studentRecord!.classId,
          },
        });

        await tx.studentFeeStructureItem.deleteMany({
          where: { studentFeeStructureId: structure.id },
        });

        if (data.feeStructureItems.length > 0) {
          await tx.studentFeeStructureItem.createMany({
            data: data.feeStructureItems.map((item) => ({
              studentFeeStructureId: structure.id,
              feeHeadId: item.feeHeadId,
              amount: item.amount,
            })),
          });
        }
      }

      return { ...user, studentRecord, passwordHash: undefined };
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    const status = (error as { status?: number })?.status;
    if (status === 400) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists', field: 'email' },
        { status: 409 }
      );
    }
    console.error('PUT Student Error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}
