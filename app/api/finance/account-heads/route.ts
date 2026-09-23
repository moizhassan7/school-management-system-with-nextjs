import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope } from '@/lib/authz';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { session, error } = await requirePermission('ACCOUNTS', 'VIEW');
    if (error || !session) return error;

    const heads = await prisma.accountHead.findMany({
      where: schoolScope(session),
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(heads);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch account heads');
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requirePermission('ACCOUNTS', 'CREATE');
    if (error || !session) return error;

    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const schoolId =
      session.user.role === 'SUPER_ADMIN'
        ? String(body.schoolId || session.user.schoolId || '')
        : session.user.schoolId || '';
    if (!schoolId) return NextResponse.json({ error: 'School is required' }, { status: 400 });

    const head = await prisma.accountHead.create({
      data: { name, schoolId },
    });
    return NextResponse.json(head, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create account head');
  }
}
