import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const updateSchema = z.object({
  mode: z.enum(['KEEP_EXISTING', 'SWITCH_TO_CLASS_DEFAULT']),
  classId: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await params;
    const studentRecord = await prisma.studentRecord.findUnique({
      where: { userId: studentId },
      include: {
        feeStructure: {
          include: {
            items: {
              include: { feeHead: true },
            },
          },
        },
      },
    });

    if (!studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const classId = studentRecord.classId;
    const classDefaults = classId
      ? await prisma.feeStructure.findMany({
          where: {
            classId,
            ...(role === 'SUPER_ADMIN' ? {} : { schoolId }),
          },
          include: { feeHead: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    return NextResponse.json({
      studentId,
      classId,
      currentFeeStructure: studentRecord.feeStructure,
      classDefaults,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load student fee structure' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = updateSchema.parse(await request.json());
    const { studentId } = await params;

    const studentRecord = await prisma.studentRecord.findUnique({
      where: { userId: studentId },
      include: { feeStructure: true },
    });

    if (!studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (body.mode === 'KEEP_EXISTING') {
      return NextResponse.json({
        success: true,
        message: 'Previous fee structure retained.',
      });
    }

    const targetClassId = body.classId || studentRecord.classId;
    if (!targetClassId) {
      return NextResponse.json({ error: 'Student class is required' }, { status: 400 });
    }

    const classDefaults = await prisma.feeStructure.findMany({
      where: {
        classId: targetClassId,
        ...(role === 'SUPER_ADMIN' ? {} : { schoolId }),
      },
    });

    if (classDefaults.length === 0) {
      return NextResponse.json({ error: 'No class fee structure found' }, { status: 400 });
    }

    const resolvedSchoolId =
      role === 'SUPER_ADMIN' ? studentRecord.feeStructure?.schoolId || schoolId : schoolId;
    if (!resolvedSchoolId) {
      return NextResponse.json({ error: 'School not found in session' }, { status: 400 });
    }

    const baseData = {
      studentRecordId: studentRecord.id,
      schoolId: resolvedSchoolId,
      classId: targetClassId,
    };

    await prisma.$transaction(async (tx) => {
      const current = studentRecord.feeStructure
        ? studentRecord.feeStructure
        : await tx.studentFeeStructure.create({
            data: baseData,
          });

      await tx.studentFeeStructure.update({
        where: { id: current.id },
        data: {
          classId: targetClassId,
        },
      });

      await tx.studentFeeStructureItem.deleteMany({
        where: { studentFeeStructureId: current.id },
      });

      await tx.studentFeeStructureItem.createMany({
        data: classDefaults.map((item) => ({
          studentFeeStructureId: current.id,
          feeHeadId: item.feeHeadId,
          amount: item.amount,
        })),
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Student fee structure updated from class defaults.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to update student fee structure' }, { status: 500 });
  }
}
