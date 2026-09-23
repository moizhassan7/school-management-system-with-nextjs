import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { forbidOrMissing, schoolIdForSubject } from '@/lib/tenant';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'DELETE');
    if (error || !session) return error;
    const { subjectId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForSubject(subjectId));
    if (denied) return denied;
    await prisma.subject.delete({
      where: { id: subjectId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}