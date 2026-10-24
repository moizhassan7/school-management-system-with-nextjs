import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { assertSameSchool, requirePermission } from '@/lib/authz';
import { deleteNotificationAttachment } from '@/lib/notification-attachments';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { session, error } = await requirePermission('NOTIFICATIONS', 'DELETE');
    if (error || !session) return error;

    const { notificationId } = await params;
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, schoolId: true, attachmentStoredName: true },
    });
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const denied = assertSameSchool(session, notification.schoolId);
    if (denied) return denied;

    await prisma.notification.delete({ where: { id: notification.id } });
    await deleteNotificationAttachment(notification.attachmentStoredName).catch((attachmentError) => {
      console.error('Failed to remove notification attachment', attachmentError);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete notification');
  }
}
