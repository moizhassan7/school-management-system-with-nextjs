import type { Prisma } from '@prisma/client';

export type NotificationAudienceKey =
  | 'EVERYONE'
  | 'STUDENTS_AND_PARENTS'
  | 'CLASS'
  | 'STUDENT';

type ResolveRecipientsInput = {
  audience: NotificationAudienceKey;
  schoolId: string;
  classId?: string;
  targetStudentId?: string;
};

const activeUser = {
  deletedAt: null,
  suspended: false,
  locked: false,
} as const;

export function uniqueRecipientIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export async function resolveNotificationRecipientIds(
  tx: Prisma.TransactionClient,
  input: ResolveRecipientsInput
) {
  if (input.audience === 'EVERYONE' || input.audience === 'STUDENTS_AND_PARENTS') {
    const users = await tx.user.findMany({
      where: {
        schoolId: input.schoolId,
        ...activeUser,
        ...(input.audience === 'STUDENTS_AND_PARENTS'
          ? { role: { in: ['STUDENT', 'PARENT'] as const } }
          : {}),
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  if (input.audience === 'CLASS') {
    const records = await tx.studentRecord.findMany({
      where: {
        classId: input.classId,
        user: { schoolId: input.schoolId, ...activeUser },
      },
      select: {
        userId: true,
        parents: {
          where: { parentRecord: { user: activeUser } },
          select: { parentRecord: { select: { userId: true } } },
        },
      },
    });

    return uniqueRecipientIds(
      records.flatMap((record) => [
        record.userId,
        ...record.parents.map((kinship) => kinship.parentRecord.userId),
      ])
    );
  }

  const student = await tx.user.findFirst({
    where: {
      id: input.targetStudentId,
      schoolId: input.schoolId,
      role: 'STUDENT',
      ...activeUser,
    },
    select: {
      id: true,
      studentRecord: {
        select: {
          parents: {
            where: { parentRecord: { user: activeUser } },
            select: { parentRecord: { select: { userId: true } } },
          },
        },
      },
    },
  });

  if (!student?.studentRecord) return [];
  return uniqueRecipientIds([
    student.id,
    ...student.studentRecord.parents.map((kinship) => kinship.parentRecord.userId),
  ]);
}
