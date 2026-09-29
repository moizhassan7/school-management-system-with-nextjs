import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { pageMeta, parsePagination } from '@/lib/pagination';

const MAX_ROWS = 5000;

function fatherName(parents: { relationship: string; isPrimary: boolean; parentRecord: { user: { name: string } } | null }[]) {
  const father = parents.find((p) => p.relationship === 'FATHER');
  const primary = parents.find((p) => p.isPrimary) || parents[0];
  return father?.parentRecord?.user?.name || primary?.parentRecord?.user?.name || '';
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed =
    can(session.user, 'REPORTS', 'VIEW') ||
    can(session.user, 'FEES', 'VIEW') ||
    ['ACCOUNTANT', 'SUPER_ADMIN', 'ADMIN'].includes(String(session.user.role));
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') === 'outstanding' ? 'outstanding' : 'paid';
  const classId = searchParams.get('classId')?.trim() || '';
  const classGroupId = searchParams.get('classGroupId')?.trim() || '';
  const monthRaw = searchParams.get('month')?.trim() || '';
  const yearRaw = searchParams.get('year')?.trim() || '';
  const all = searchParams.get('all') === '1';
  const parsed = parsePagination(searchParams, {
    defaultPageSize: all ? MAX_ROWS : 25,
    maxPageSize: all ? MAX_ROWS : 100,
    minPageSize: all ? 1 : 10,
  });

  const month = monthRaw ? Number(monthRaw) : null;
  const year = yearRaw ? Number(yearRaw) : null;
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }
  if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const schoolId = session.user.role === 'SUPER_ADMIN' ? undefined : session.user.schoolId || '__none__';

  const studentRecord: Prisma.StudentRecordWhereInput = {};
  if (classId) studentRecord.classId = classId;
  else if (classGroupId) studentRecord.myClass = { classGroupId };

  const where: Prisma.InvoiceWhereInput = {
    ...(schoolId ? { schoolId } : {}),
    status: kind === 'paid' ? { in: ['PAID', 'PARTIAL'] } : { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
    ...(month != null ? { month } : {}),
    ...(year != null ? { year } : {}),
    ...(Object.keys(studentRecord).length
      ? { student: { deletedAt: null, studentRecord: { is: studentRecord } } }
      : { student: { deletedAt: null } }),
  };

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      invoiceNo: true,
      month: true,
      year: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      status: true,
      updatedAt: true,
      payments: {
        select: { amount: true, date: true, method: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      student: {
        select: {
          id: true,
          name: true,
          phone: true,
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
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { student: { name: 'asc' } }],
    take: MAX_ROWS,
  });

  const truncated = invoices.length >= MAX_ROWS;

  if (kind === 'paid') {
    const rows = invoices
      .map((invoice) => {
        const paid = Number(invoice.paidAmount);
        if (paid <= 0) return null;
        const payment = invoice.payments[0];
        const record = invoice.student.studentRecord;
        return {
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          studentId: invoice.student.id,
          studentName: invoice.student.name,
          fatherName: fatherName(record?.parents || []),
          phone: invoice.student.phone || '',
          admissionNumber: record?.admissionNumber || '',
          rollNumber: record?.rollNumber || '',
          className: record?.myClass?.name || 'Unassigned',
          sectionName: record?.section?.name || '',
          month: invoice.month,
          year: invoice.year,
          status: invoice.status,
          paidAmount: paid,
          totalAmount: Number(invoice.totalAmount),
          method: payment?.method || '',
          paidOn: (payment?.date || invoice.updatedAt).toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const totalCollected = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    const page = all ? 1 : parsed.page;
    const pageSize = all ? rows.length || parsed.pageSize : parsed.pageSize;
    const start = all ? 0 : (page - 1) * pageSize;

    return NextResponse.json({
      kind,
      rows: rows.slice(start, start + pageSize),
      summary: {
        invoiceCount: rows.length,
        totalCollected,
      },
      ...pageMeta(page, pageSize, rows.length),
      truncated,
    });
  }

  const byStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      fatherName: string;
      phone: string;
      admissionNumber: string;
      rollNumber: string;
      className: string;
      sectionName: string;
      invoiceCount: number;
      totalBilled: number;
      totalPaid: number;
      outstanding: number;
    }
  >();

  for (const invoice of invoices) {
    const billed = Number(invoice.totalAmount);
    const paid = Number(invoice.paidAmount);
    const balance = Math.max(billed - paid, 0);
    if (balance <= 0) continue;
    const record = invoice.student.studentRecord;
    const current = byStudent.get(invoice.student.id) || {
      studentId: invoice.student.id,
      studentName: invoice.student.name,
      fatherName: fatherName(record?.parents || []),
      phone: invoice.student.phone || '',
      admissionNumber: record?.admissionNumber || '',
      rollNumber: record?.rollNumber || '',
      className: record?.myClass?.name || 'Unassigned',
      sectionName: record?.section?.name || '',
      invoiceCount: 0,
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
    };
    current.invoiceCount += 1;
    current.totalBilled += billed;
    current.totalPaid += paid;
    current.outstanding += balance;
    byStudent.set(invoice.student.id, current);
  }

  const rows = Array.from(byStudent.values()).sort((a, b) => {
    const classCompare = a.className.localeCompare(b.className);
    if (classCompare !== 0) return classCompare;
    return a.studentName.localeCompare(b.studentName);
  });

  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);
  const page = all ? 1 : parsed.page;
  const pageSize = all ? rows.length || parsed.pageSize : parsed.pageSize;
  const start = all ? 0 : (page - 1) * pageSize;

  return NextResponse.json({
    kind,
    rows: rows.slice(start, start + pageSize),
    summary: {
      studentCount: rows.length,
      invoiceCount: rows.reduce((sum, row) => sum + row.invoiceCount, 0),
      totalOutstanding,
    },
    ...pageMeta(page, pageSize, rows.length),
    truncated,
  });
}
