import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

export async function PATCH() {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) return error;
    if (!session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const updated = await prisma.notificationRecipient.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true, updated: updated.count });
  } catch (error) {
    return handleApiError(error, 'Failed to mark notifications as read');
  }
}
