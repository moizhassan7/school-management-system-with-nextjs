import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission, assertSameSchool } from '@/lib/authz';
import { handleApiError } from '@/lib/api-error';

const itemSchema = z.object({
  feeHeadId: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
});

const customInvoiceSchema = z.object({
  schoolId: z.string().min(1).optional(),
  studentId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  dueDate: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('FEES', 'CREATE');
    if (error || !session) return error;

    const data = customInvoiceSchema.parse(await request.json());
    const schoolId =
      session.user.role === 'SUPER_ADMIN'
        ? data.schoolId || session.user.schoolId
        : session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School is required' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: data.studentId },
      select: { schoolId: true, studentRecord: { select: { admissionNumber: true } } },
    });
    if (!student?.studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    const denied = assertSameSchool(session, student.schoolId);
    if (denied) return denied;
    if (student.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Student does not belong to this school' }, { status: 403 });
    }

    const requestedItems = data.items.filter((item) => Number(item.amount) > 0);
    if (requestedItems.length === 0) {
      return NextResponse.json({ error: 'Add at least one charge with an amount' }, { status: 400 });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const heads = await tx.feeHead.findMany({
        where: { id: { in: requestedItems.map((item) => item.feeHeadId) }, schoolId },
        select: { id: true },
      });
      const knownHeads = new Set(heads.map((head) => head.id));
      if (requestedItems.some((item) => !knownHeads.has(item.feeHeadId))) {
        throw Object.assign(new Error('One of the charges does not belong to this school'), { status: 400 });
      }

      const openInvoice = await tx.invoice.findFirst({
        where: {
          studentId: data.studentId,
          schoolId,
          month: data.month,
          year: data.year,
          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: { select: { feeHeadId: true } } },
      });

      if (openInvoice) {
        const alreadyOnChallan = new Set(openInvoice.items.map((item) => item.feeHeadId));
        const toAdd = requestedItems.filter((item) => !alreadyOnChallan.has(item.feeHeadId));
        if (toAdd.length === 0) {
          throw Object.assign(
            new Error('These charges are already on the open challan for this month.'),
            { status: 409 }
          );
        }

        await tx.invoiceItem.createMany({
          data: toAdd.map((item) => ({
            invoiceId: openInvoice.id,
            feeHeadId: item.feeHeadId,
            amount: item.amount,
            originalAmount: item.amount,
          })),
        });

        const addedAmount = toAdd.reduce((sum, item) => sum + Number(item.amount), 0);
        const updated = await tx.invoice.update({
          where: { id: openInvoice.id },
          data: { totalAmount: { increment: addedAmount } },
          include: { items: { include: { feeHead: true } } },
        });
        return { ...updated, updatedExisting: true };
      }

      const totalAmount = requestedItems.reduce((sum, item) => sum + Number(item.amount), 0);
      const admission = student.studentRecord?.admissionNumber || 'STU';
      const invoiceNo = `INV-${data.year}${String(data.month).padStart(2, '0')}-${admission}-${Date.now().toString().slice(-6)}`;

      const created = await tx.invoice.create({
        data: {
          schoolId,
          studentId: data.studentId,
          month: data.month,
          year: data.year,
          dueDate: new Date(data.dueDate),
          invoiceNo,
          totalAmount,
          status: 'UNPAID',
          items: {
            create: requestedItems.map((item) => ({
              feeHeadId: item.feeHeadId,
              amount: item.amount,
              originalAmount: item.amount,
            })),
          },
        },
        include: { items: { include: { feeHead: true } } },
      });
      return { ...created, updatedExisting: false };
    });

    return NextResponse.json(invoice, { status: invoice.updatedExisting ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid challan', issues: error.issues }, { status: 400 });
    }
    const status = (error as { status?: number })?.status;
    if (status === 400 || status === 409) {
      return NextResponse.json(
        { error: (error as Error).message, invoiceNo: (error as { invoiceNo?: string }).invoiceNo },
        { status }
      );
    }
    return handleApiError(error, 'Failed to create challan');
  }
}
