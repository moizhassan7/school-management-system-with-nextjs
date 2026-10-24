import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { assertSameSchool, requirePermission } from '@/lib/authz';
import { deleteDiaryAttachment } from '@/lib/diary-attachments';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ diaryId: string }> }
) {
  try {
    const { session, error } = await requirePermission('DIARIES', 'DELETE');
    if (error || !session) return error;
    const { diaryId } = await params;
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      select: {
        id: true,
        schoolId: true,
        status: true,
        createdById: true,
        notificationId: true,
        attachmentStoredName: true,
      },
    });
    if (!diary) return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    const denied = assertSameSchool(session, diary.schoolId);
    if (denied) return denied;

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(String(session.user.role));
    if (!isAdmin && (diary.createdById !== session.user.id || diary.status === 'PUBLISHED')) {
      return NextResponse.json({ error: 'Published diaries can only be removed by an administrator' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.diary.delete({ where: { id: diary.id } });
      if (diary.notificationId) {
        await tx.notification.deleteMany({ where: { id: diary.notificationId } });
      }
    });
    await deleteDiaryAttachment(diary.attachmentStoredName).catch((attachmentError) => {
      console.error('Failed to delete diary attachment', attachmentError);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete diary');
  }
}
