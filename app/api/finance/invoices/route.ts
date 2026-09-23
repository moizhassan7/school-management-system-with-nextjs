import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user, 'FEES', 'VIEW') && !['ACCOUNTANT', 'SUPER_ADMIN', 'ADMIN'].includes(String(session.user.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get('pageSize') || 25)));
  const status = searchParams.get('status')?.trim();
  const q = searchParams.get('q')?.trim() || '';

  const where: Record<string, unknown> =
    session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' };

  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { invoiceNo: { contains: q, mode: 'insensitive' } },
      { student: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { student: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: invoices,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
