import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission, assertSameSchool } from '@/lib/authz';
import { applyInvoicePayment, PaymentRejectedError } from '@/lib/payments';
import { handleApiError } from '@/lib/api-error';

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE']).optional(),
  transactionId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('FEES', 'CREATE');
    if (error || !session) return error;

    const body = paymentSchema.parse(await request.json());

    const invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
      select: { id: true, schoolId: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const denied = assertSameSchool(session, invoice.schoolId);
    if (denied) return denied;

    await prisma.$transaction(async (tx) => {
      await applyInvoicePayment(tx, {
        invoiceId: invoice.id,
        amount: body.amount,
        method: body.method || 'CASH',
        transactionId: body.transactionId,
        schoolId: invoice.schoolId,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment', issues: error.issues }, { status: 400 });
    }
    if (error instanceof PaymentRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, 'Payment failed');
  }
}
