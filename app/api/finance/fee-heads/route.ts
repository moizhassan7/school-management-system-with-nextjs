import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const where = role === 'SUPER_ADMIN' ? {} : { schoolId };
  const heads = await prisma.feeHead.findMany({ where });
  return NextResponse.json(heads);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const head = await prisma.feeHead.create({
    data: { name: body.name, schoolId: role === 'SUPER_ADMIN' ? body.schoolId : schoolId, type: body.type }
  });
  return NextResponse.json(head);
}
