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
  const invoices = await prisma.invoice.findMany({
    where,
    include: { student: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return NextResponse.json(invoices);
}
