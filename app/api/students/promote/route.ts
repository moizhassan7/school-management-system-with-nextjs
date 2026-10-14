import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { assertSameSchool, requirePermission } from '@/lib/authz';

const promoteSchema = z.object({
  mode: z.enum(['CLASS', 'INDIVIDUAL']),
  sourceClassId: z.string().min(1),
  sourceSectionId: z.string().optional().nullable(),
  targetClassId: z.string().min(1),
  targetSectionId: z.string().optional().nullable(),
  studentIds: z.array(z.string().min(1)).optional(),
  feeMode: z.enum(['KEEP_EXISTING', 'SWITCH_TO_CLASS_DEFAULT']).default('KEEP_EXISTING'),
});

async function loadClass(classId: string) {
  return prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      classGroupId: true,
      classGroup: {
        select: {
          campus: {
            select: { schoolId: true },
          },
        },
      },
    },
  });
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('STUDENTS', 'EDIT');
    if (error || !session) return error;

    const body = await request.json();
    const data = promoteSchema.parse(body);
    const sourceSectionId = data.sourceSectionId || null;
    const targetSectionId = data.targetSectionId || null;
    const studentIds = data.studentIds || [];

    if (data.mode === 'INDIVIDUAL' && studentIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one student to promote' }, { status: 400 });
    }

    if (
      data.sourceClassId === data.targetClassId &&
      (sourceSectionId || null) === (targetSectionId || null)
    ) {
      return NextResponse.json({ error: 'Source and target placement are the same' }, { status: 400 });
    }

    const [sourceClass, targetClass] = await Promise.all([
      loadClass(data.sourceClassId),
      loadClass(data.targetClassId),
    ]);

    if (!sourceClass || !targetClass) {
      return NextResponse.json({ error: 'Source or target class not found' }, { status: 404 });
    }

    const sourceSchoolId = sourceClass.classGroup.campus.schoolId;
    const targetSchoolId = targetClass.classGroup.campus.schoolId;

    const denied = assertSameSchool(session, sourceSchoolId);
    if (denied) return denied;

    if (sourceSchoolId !== targetSchoolId) {
      return NextResponse.json(
        { error: 'Students cannot be promoted across different schools' },
        { status: 400 }
      );
    }

    if (sourceSectionId) {
      const sourceSection = await prisma.section.findFirst({
        where: { id: sourceSectionId, classId: data.sourceClassId },
        select: { id: true },
      });
      if (!sourceSection) {
        return NextResponse.json({ error: 'Source section does not belong to source class' }, { status: 400 });
      }
    }

    if (targetSectionId) {
      const targetSection = await prisma.section.findFirst({
        where: { id: targetSectionId, classId: data.targetClassId },
        select: { id: true },
      });
      if (!targetSection) {
        return NextResponse.json({ error: 'Target section does not belong to target class' }, { status: 400 });
      }
    }

    const recordWhere: Prisma.StudentRecordWhereInput = {
      schoolId: sourceSchoolId,
      classId: data.sourceClassId,
      user: { deletedAt: null },
    };

    if (sourceSectionId) recordWhere.sectionId = sourceSectionId;
    if (data.mode === 'INDIVIDUAL') recordWhere.userId = { in: studentIds };

    const records = await prisma.studentRecord.findMany({
      where: recordWhere,
      select: {
        id: true,
        userId: true,
        classId: true,
        sectionId: true,
        subjectGroupId: true,
      },
      orderBy: [{ rollNumber: 'asc' }, { user: { name: 'asc' } }],
    });

    if (data.mode === 'INDIVIDUAL' && records.length !== new Set(studentIds).size) {
      return NextResponse.json(
        { error: 'One or more selected students are not in the source class' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No students found to promote' }, { status: 400 });
    }

    const classFeeStructures =
      data.feeMode === 'SWITCH_TO_CLASS_DEFAULT'
        ? await prisma.feeStructure.findMany({
            where: { classId: data.targetClassId, schoolId: sourceSchoolId },
            select: { feeHeadId: true, amount: true },
          })
        : [];

    const clearSubjectGroup = sourceClass.classGroupId !== targetClass.classGroupId;
    const recordIds = records.map((record) => record.id);

    const result = await prisma.$transaction(
      async (tx) => {
        const academicYear = await tx.academicYear.findFirst({
          where: { schoolId: sourceSchoolId },
          orderBy: [{ createdAt: 'desc' }],
          select: { id: true },
        });

        if (academicYear) {
          const historyCandidates = records.filter((record) => record.classId);
          if (historyCandidates.length > 0) {
            const existingHistory = await tx.academicYearStudentRecord.findMany({
              where: {
                academicYearId: academicYear.id,
                studentRecordId: { in: historyCandidates.map((record) => record.id) },
              },
              select: {
                studentRecordId: true,
                classId: true,
                sectionId: true,
              },
            });

            const existingKeys = new Set(
              existingHistory.map(
                (row) => `${row.studentRecordId}|${row.classId || ''}|${row.sectionId || ''}`
              )
            );

            const historyToCreate = historyCandidates
              .filter(
                (record) =>
                  !existingKeys.has(
                    `${record.id}|${record.classId || ''}|${record.sectionId || ''}`
                  )
              )
              .map((record) => ({
                academicYearId: academicYear.id,
                studentRecordId: record.id,
                classId: record.classId,
                sectionId: record.sectionId,
              }));

            if (historyToCreate.length > 0) {
              await tx.academicYearStudentRecord.createMany({ data: historyToCreate });
            }
          }
        }

        await tx.studentRecord.updateMany({
          where: { id: { in: recordIds } },
          data: {
            classId: data.targetClassId,
            sectionId: targetSectionId,
            ...(clearSubjectGroup ? { subjectGroupId: null } : {}),
          },
        });

        if (data.feeMode === 'KEEP_EXISTING') {
          await tx.studentFeeStructure.updateMany({
            where: { studentRecordId: { in: recordIds } },
            data: { classId: data.targetClassId },
          });
        } else {
          const existingStructures = await tx.studentFeeStructure.findMany({
            where: { studentRecordId: { in: recordIds } },
            select: { id: true, studentRecordId: true },
          });
          const existingByRecord = new Map(
            existingStructures.map((structure) => [structure.studentRecordId, structure.id])
          );

          const missingRecordIds = recordIds.filter((id) => !existingByRecord.has(id));
          if (missingRecordIds.length > 0) {
            await tx.studentFeeStructure.createMany({
              data: missingRecordIds.map((studentRecordId) => ({
                studentRecordId,
                classId: data.targetClassId,
                schoolId: sourceSchoolId,
              })),
            });
          }

          await tx.studentFeeStructure.updateMany({
            where: { studentRecordId: { in: recordIds } },
            data: {
              classId: data.targetClassId,
              schoolId: sourceSchoolId,
            },
          });

          const structures = await tx.studentFeeStructure.findMany({
            where: { studentRecordId: { in: recordIds } },
            select: { id: true },
          });
          const structureIds = structures.map((structure) => structure.id);

          if (structureIds.length > 0) {
            await tx.studentFeeStructureItem.deleteMany({
              where: { studentFeeStructureId: { in: structureIds } },
            });

            if (classFeeStructures.length > 0) {
              await tx.studentFeeStructureItem.createMany({
                data: structureIds.flatMap((studentFeeStructureId) =>
                  classFeeStructures.map((item) => ({
                    studentFeeStructureId,
                    feeHeadId: item.feeHeadId,
                    amount: item.amount,
                  }))
                ),
              });
            }
          }
        }

        return { promotedCount: records.length };
      },
      {
        // Full-class promotions can touch hundreds of students; default 5s interactive TX times out (P2028).
        maxWait: 15_000,
        timeout: 120_000,
      }
    );

    return NextResponse.json({
      message: `${result.promotedCount} student${result.promotedCount === 1 ? '' : 's'} promoted to ${targetClass.name}`,
      promotedCount: result.promotedCount,
      targetClass: { id: targetClass.id, name: targetClass.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    console.error('Promote Students Error:', error);
    const prismaCode = (error as { code?: string })?.code;
    if (prismaCode === 'P2028') {
      return NextResponse.json(
        {
          error:
            'Promotion timed out. Try promoting fewer students at once, or retry — the server may have been busy.',
        },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: 'Failed to promote students' }, { status: 500 });
  }
}
