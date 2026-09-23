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
  cancelInvoiceNo: z.string().optional(),
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

    const invoice = await prisma.$transaction(async (tx) => {
      if (data.cancelInvoiceNo) {
        const prevInvoice = await tx.invoice.findUnique({
          where: { invoiceNo: data.cancelInvoiceNo },
        });
        if (prevInvoice) {
          if (prevInvoice.studentId !== data.studentId || prevInvoice.schoolId !== schoolId) {
            throw Object.assign(new Error('Invoice to cancel does not belong to this student'), {
              status: 400,
            });
          }
          await tx.invoice.update({
            where: { id: prevInvoice.id },
            data: { status: 'CANCELLED' },
          });
        }
      }

      const existingSamePeriod = await tx.invoice.findFirst({
        where: {
          studentId: data.studentId,
          month: data.month,
          year: data.year,
          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
        },
        select: { invoiceNo: true },
      });

      if (existingSamePeriod && !data.cancelInvoiceNo) {
        throw Object.assign(
          new Error(
            'This student already has an unpaid challan for the selected month. Cancel previous challan by barcode or clear dues first.'
          ),
          { status: 409, invoiceNo: existingSamePeriod.invoiceNo }
        );
      }

      const finalItems = [...data.items];
      const pendingInvoices = await tx.invoice.findMany({
        where: {
          studentId: data.studentId,
          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
        },
        select: { totalAmount: true, paidAmount: true },
      });

      const pendingArrears = pendingInvoices.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0)),
        0
      );

      if (pendingArrears > 0) {
        let arrearsHead = await tx.feeHead.findFirst({
          where: { schoolId, name: { equals: 'Arrears', mode: 'insensitive' } },
        });
        if (!arrearsHead) {
          arrearsHead = await tx.feeHead.create({
            data: { schoolId, name: 'Arrears', type: 'ONE_TIME' },
          });
        }
        const alreadyIncluded = finalItems.some((item) => item.feeHeadId === arrearsHead!.id);
        if (!alreadyIncluded) {
          finalItems.push({ feeHeadId: arrearsHead.id, amount: pendingArrears });
        }
      }

      const totalAmount = finalItems.reduce((sum, item) => sum + Number(item.amount), 0);
      const admission = student.studentRecord?.admissionNumber || 'STU';
      const invoiceNo = `INV-${data.year}${String(data.month).padStart(2, '0')}-${admission}-${Date.now().toString().slice(-6)}`;

      return tx.invoice.create({
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
            create: finalItems.map((item) => ({
              feeHeadId: item.feeHeadId,
              amount: item.amount,
              originalAmount: item.amount,
            })),
          },
        },
        include: { items: { include: { feeHead: true } } },
      });
    });

    return NextResponse.json(invoice, { status: 201 });
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
