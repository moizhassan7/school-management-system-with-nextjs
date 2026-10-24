import { NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error';
import { assertSameSchool, requirePermission } from '@/lib/authz';
import { canPublishDiary, canRejectDiary } from '@/lib/diary-workflow';
import { resolveNotificationRecipientIds } from '@/lib/notification-targeting';
import { prisma } from '@/lib/prisma';

const reviewSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('PUBLISH') }),
  z.object({ action: z.literal('REJECT'), reason: z.string().trim().min(3).max(500) }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ diaryId: string }> }
) {
  try {
    const { session, error } = await requirePermission('DIARIES', 'APPROVE');
    if (error || !session) return error;
    if (!session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = reviewSchema.parse(await request.json());
    const { diaryId } = await params;
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: {
        myClass: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
    if (!diary) return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    const denied = assertSameSchool(session, diary.schoolId);
    if (denied) return denied;

    if (data.action === 'REJECT') {
      if (!canRejectDiary(diary.status)) {
        return NextResponse.json({ error: 'Only pending diaries can be rejected' }, { status: 409 });
      }
      const rejected = await prisma.diary.update({
        where: { id: diary.id },
        data: {
          status: 'REJECTED',
          rejectionReason: data.reason,
          approvedById: session.user.id,
        },
      });
      return NextResponse.json({ diary: rejected, message: 'Diary returned to the teacher' });
    }

    if (!canPublishDiary(diary.status)) {
      return NextResponse.json({ error: 'This diary has already been published' }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.diary.updateMany({
        where: {
          id: diary.id,
          status: { in: ['PENDING_APPROVAL', 'REJECTED'] },
          notificationId: null,
        },
        data: {
          status: 'PUBLISHED',
          rejectionReason: null,
          approvedById: session.user.id,
          publishedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw Object.assign(new Error('This diary has already been reviewed'), { status: 409 });
      }

      const recipientIds = await resolveNotificationRecipientIds(tx, {
        audience: 'CLASS',
        schoolId: diary.schoolId,
        classId: diary.classId,
      });
      if (recipientIds.length === 0) {
        throw Object.assign(new Error('No active student or parent logins were found for this class'), {
          status: 400,
        });
      }

      const dueLine = diary.dueDate
        ? `\n\nDue: ${diary.dueDate.toISOString().slice(0, 10)}`
        : '';
      const notification = await tx.notification.create({
        data: {
          schoolId: diary.schoolId,
          classId: diary.classId,
          audience: 'CLASS',
          createdById: diary.createdById,
          title: `Homework · ${diary.subject.name}: ${diary.title}`,
          message: `${diary.message}${dueLine}`,
        },
        select: { id: true },
      });
      await tx.notificationRecipient.createMany({
        data: recipientIds.map((userId) => ({ notificationId: notification.id, userId })),
        skipDuplicates: true,
      });
      await tx.diary.update({
        where: { id: diary.id },
        data: { notificationId: notification.id },
      });

      return { recipientCount: recipientIds.length };
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Diary approved and posted to ${result.recipientCount} login${result.recipientCount === 1 ? '' : 's'}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid review' }, { status: 400 });
    }
    const status = (error as { status?: number }).status;
    if (status === 400 || status === 409) {
      return NextResponse.json({ error: (error as Error).message }, { status });
    }
    return handleApiError(error, 'Failed to review diary');
  }
}
