import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/authz';
import { can } from '@/lib/permissions';
import { readNotificationAttachment } from '@/lib/notification-attachments';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) return error;
    if (!session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationId } = await params;
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        schoolId: true,
        createdById: true,
        attachmentStoredName: true,
        attachmentName: true,
        attachmentMimeType: true,
        recipients: {
          where: { userId: session.user.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!notification?.attachmentStoredName || !notification.attachmentName) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const isSameSchool =
      session.user.role === 'SUPER_ADMIN' || session.user.schoolId === notification.schoolId;
    const mayManage = isSameSchool && can(session.user, 'NOTIFICATIONS', 'VIEW');
    const isAllowed =
      notification.createdById === session.user.id ||
      notification.recipients.length > 0 ||
      mayManage;
    if (!isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const file = await readNotificationAttachment(notification.attachmentStoredName);
    const encodedName = encodeURIComponent(notification.attachmentName);
    return new Response(file, {
      headers: {
        'Content-Type': notification.attachmentMimeType || 'application/octet-stream',
        'Content-Length': String(file.byteLength),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to download attachment');
  }
}
