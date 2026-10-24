import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) return error;
    if (!session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationId } = await params;
    const updated = await prisma.notificationRecipient.updateMany({
      where: { notificationId, userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) {
      const exists = await prisma.notificationRecipient.count({
        where: { notificationId, userId: session.user.id },
      });
      if (!exists) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to mark notification as read');
  }
}
