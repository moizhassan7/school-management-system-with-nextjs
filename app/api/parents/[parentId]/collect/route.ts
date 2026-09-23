import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission, assertSameSchool } from '@/lib/authz';
import { applyInvoicePayment, PaymentRejectedError } from '@/lib/payments';
import { handleApiError } from '@/lib/api-error';

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE']),
  remarks: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const { session, error } = await requirePermission('FEES', 'CREATE');
    if (error || !session) return error;

    const { parentId } = await params;
    const { amount, method, remarks } = paymentSchema.parse(await request.json());

    const parentUser = await prisma.user.findUnique({
      where: { id: parentId },
      select: { schoolId: true, role: true },
    });
    if (!parentUser || parentUser.role !== 'PARENT') {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }
    const denied = assertSameSchool(session, parentUser.schoolId);
    if (denied) return denied;

    const parentRecord = await prisma.parentRecord.findUnique({
      where: { userId: parentId },
      include: {
        students: {
          include: {
            studentRecord: {
              include: {
                user: {
                  include: {
                    invoices: {
                      where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
                      orderBy: { dueDate: 'asc' },
                      select: { id: true, invoiceNo: true, dueDate: true, schoolId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!parentRecord) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const invoiceQueue = parentRecord.students
      .flatMap((kinship) =>
        kinship.studentRecord.user.invoices.map((inv) => ({
          ...inv,
          studentName: kinship.studentRecord.user.name,
        }))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const results = await prisma.$transaction(async (tx) => {
      let remaining = amount;
      const paymentsMade: {
        invoiceNo: string;
        student: string;
        paid: number;
        status: string;
      }[] = [];

      for (const invoice of invoiceQueue) {
        if (remaining <= 0) break;
        if (invoice.schoolId !== parentUser.schoolId) continue;

        const fresh = await tx.invoice.findUnique({ where: { id: invoice.id } });
        if (!fresh || fresh.status === 'CANCELLED' || fresh.status === 'PAID') continue;

        const due = Number(fresh.totalAmount) - Number(fresh.paidAmount);
        if (due <= 0) continue;

        const amountToPay = Math.min(remaining, due);
        try {
          await applyInvoicePayment(tx, {
            invoiceId: fresh.id,
            amount: amountToPay,
            method,
            transactionId: remarks || null,
            schoolId: fresh.schoolId,
          });
        } catch (err) {
          if (err instanceof PaymentRejectedError) continue;
          throw err;
        }

        const after = await tx.invoice.findUnique({ where: { id: fresh.id } });
        paymentsMade.push({
          invoiceNo: invoice.invoiceNo,
          student: invoice.studentName,
          paid: amountToPay,
          status: after?.status || 'PARTIAL',
        });
        remaining -= amountToPay;
      }

      return { paymentsMade, remaining };
    });

    return NextResponse.json({
      success: true,
      distributedAmount: amount - results.remaining,
      remainingBalance: results.remaining,
      breakdown: results.paymentsMade,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment', issues: error.issues }, { status: 400 });
    }
    return handleApiError(error, 'Payment processing failed');
  }
}
