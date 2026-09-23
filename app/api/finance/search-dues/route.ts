import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, assertSameSchool, stripSecrets } from '@/lib/authz';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('FEES', 'VIEW');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const schoolFilter =
      session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' };

    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNo: query, ...schoolFilter },
      select: { studentId: true, schoolId: true },
    });

    const studentRecord = invoice
      ? await prisma.studentRecord.findUnique({
          where: { userId: invoice.studentId },
          include: studentInclude,
        })
      : await prisma.studentRecord.findFirst({
          where: {
            user: schoolFilter,
            OR: [
              { admissionNumber: { equals: query, mode: 'insensitive' } },
              { user: { name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          include: studentInclude,
        });

    if (!studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const denied = assertSameSchool(session, studentRecord.user.schoolId);
    if (denied) return denied;

    const invoices = await prisma.invoice.findMany({
      where: {
        studentId: studentRecord.userId,
        schoolId: studentRecord.user.schoolId,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: { payments: { orderBy: { date: 'desc' } } },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(
      stripSecrets({
        id: studentRecord.userId,
        name: studentRecord.user.name,
        gender: studentRecord.user.gender,
        fatherName:
          studentRecord.parents?.find((parent) => parent.relationship === 'FATHER')?.parentRecord?.user
            ?.name ||
          studentRecord.parents?.[0]?.parentRecord?.user?.name ||
          '',
        admissionNumber: studentRecord.admissionNumber,
        className: `${studentRecord.myClass?.name || 'No Class'} ${
          studentRecord.section ? `(${studentRecord.section.name})` : ''
        }`,
        invoices,
      })
    );
  } catch (error) {
    return handleApiError(error, 'Internal Error');
  }
}

const studentInclude = {
  user: { select: { name: true, gender: true, schoolId: true } },
  myClass: true,
  section: true,
  parents: {
    include: {
      parentRecord: {
        include: { user: { select: { name: true } } },
      },
    },
  },
} as const;
