import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  if(!classId) return NextResponse.json([]);
  const where = role === 'SUPER_ADMIN' ? { classId } : { classId, schoolId };
  const structures = await prisma.feeStructure.findMany({
    where, include: { feeHead: true }
  });
  return NextResponse.json(structures);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const structure = await prisma.feeStructure.upsert({
    where: { feeHeadId_classId: { feeHeadId: body.feeHeadId, classId: body.classId } },
    update: { amount: body.amount },
    create: { classId: body.classId, feeHeadId: body.feeHeadId, amount: body.amount, schoolId: role === 'SUPER_ADMIN' ? body.schoolId : schoolId }
  });
  return NextResponse.json(structure);
}
