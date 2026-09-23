import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope, assertSameSchool } from '@/lib/authz';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { session, error } = await requirePermission('ACCOUNTS', 'VIEW');
    if (error || !session) return error;

    const subheads = await prisma.accountSubHead.findMany({
      where: schoolScope(session),
      include: { head: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(subheads);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch subheads');
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requirePermission('ACCOUNTS', 'CREATE');
    if (error || !session) return error;

    const body = await req.json();
    const name = String(body.name || '').trim();
    const headId = String(body.headId || '');
    if (!name || !headId) {
      return NextResponse.json({ error: 'Name and head are required' }, { status: 400 });
    }

    const head = await prisma.accountHead.findUnique({
      where: { id: headId },
      select: { schoolId: true },
    });
    if (!head) return NextResponse.json({ error: 'Account head not found' }, { status: 404 });
    const denied = assertSameSchool(session, head.schoolId);
    if (denied) return denied;

    const subhead = await prisma.accountSubHead.create({
      data: { name, headId, schoolId: head.schoolId },
    });
    return NextResponse.json(subhead, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create subhead');
  }
}
