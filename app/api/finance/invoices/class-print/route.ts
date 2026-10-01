import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';

const MAX_CHALLANS = 300;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user, 'FEES', 'VIEW') && !['ACCOUNTANT', 'SUPER_ADMIN', 'ADMIN'].includes(String(session.user.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId')?.trim() || '';
  const monthRaw = searchParams.get('month')?.trim() || '';
  const yearRaw = searchParams.get('year')?.trim() || '';

  if (!classId) {
    return NextResponse.json({ error: 'Select a class first' }, { status: 400 });
  }

  const month = monthRaw ? Number(monthRaw) : null;
  const year = yearRaw ? Number(yearRaw) : null;
  if ((monthRaw && !yearRaw) || (!monthRaw && yearRaw)) {
    return NextResponse.json({ error: 'Month and year are required together' }, { status: 400 });
  }
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }
  if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const schoolId = session.user.role === 'SUPER_ADMIN' ? undefined : session.user.schoolId || '__none__';

  const where = {
    ...(schoolId ? { schoolId } : {}),
    status: { not: 'CANCELLED' as const },
    ...(month != null && year != null ? { month, year } : {}),
    student: {
      deletedAt: null,
      studentRecord: { is: { classId } },
    },
  };

  const [total, invoices, school] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        items: {
          include: { feeHead: { select: { id: true, name: true } } },
        },
        student: {
          select: {
            id: true,
            name: true,
            studentRecord: {
              select: {
                admissionNumber: true,
                rollNumber: true,
                myClass: { select: { name: true } },
                section: { select: { name: true } },
                parents: {
                  select: {
                    relationship: true,
                    isPrimary: true,
                    parentRecord: { select: { user: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { student: { name: 'asc' } },
        { year: 'asc' },
        { month: 'asc' },
      ],
      take: MAX_CHALLANS,
    }),
    schoolId && schoolId !== '__none__'
      ? prisma.school.findUnique({
          where: { id: schoolId },
          select: { name: true, address: true, logoPath: true },
        })
      : prisma.school.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { name: true, address: true, logoPath: true },
        }),
  ]);

  const data = invoices.map((invoice) => ({
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
    items: invoice.items.map((item) => ({
      ...item,
      amount: Number(item.amount),
      originalAmount: Number(item.originalAmount),
      discountAmount: Number(item.discountAmount),
    })),
  }));

  return NextResponse.json({
    data,
    total,
    truncated: total > data.length,
    school,
  });
}
