import { Prisma } from '@prisma/client';

export class PaymentRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentRejectedError';
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Atomically increases paidAmount only when the new total does not exceed the invoice.
 * Concurrent requests cannot both pass a stale balance check.
 */
export async function applyInvoicePayment(
  tx: Tx,
  args: {
    invoiceId: string;
    amount: number;
    method: string;
    transactionId?: string | null;
    schoolId: string;
  }
) {
  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentRejectedError('Amount must be greater than zero');
  }

  const updated = await tx.$executeRaw`
    UPDATE "Invoice"
    SET
      "paidAmount" = "paidAmount" + ${amount}::decimal,
      "status" = CASE
        WHEN "paidAmount" + ${amount}::decimal >= "totalAmount" THEN 'PAID'::"InvoiceStatus"
        ELSE 'PARTIAL'::"InvoiceStatus"
      END,
      "updatedAt" = NOW()
    WHERE "id" = ${args.invoiceId}
      AND "schoolId" = ${args.schoolId}
      AND "status" <> 'CANCELLED'::"InvoiceStatus"
      AND "paidAmount" + ${amount}::decimal <= "totalAmount"
  `;

  if (Number(updated) !== 1) {
    throw new PaymentRejectedError('Amount exceeds pending balance or invoice is not payable');
  }

  await tx.payment.create({
    data: {
      amount,
      method: (args.method || 'CASH') as 'CASH' | 'BANK_TRANSFER' | 'ONLINE' | 'CHEQUE',
      transactionId: args.transactionId || null,
      invoiceId: args.invoiceId,
      schoolId: args.schoolId,
      date: new Date(),
    },
  });
}
