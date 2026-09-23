import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, stripSecrets } from '@/lib/authz';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) return error;
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parent = await prisma.parentRecord.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!parent) return NextResponse.json([]);

    const kinships = await prisma.kinship.findMany({
      where: { parentId: parent.id },
      include: {
        studentRecord: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            myClass: true,
            section: true,
          },
        },
      },
    });

    return NextResponse.json(stripSecrets(kinships));
  } catch (error) {
    return handleApiError(error, 'Failed to load children');
  }
}
