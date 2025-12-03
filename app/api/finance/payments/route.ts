import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { invoiceId, amount, method } = await request.json();

    // 1. Verify Invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (role !== 'SUPER_ADMIN' && invoice.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        amount: amount,
        method: method || 'CASH',
        invoiceId: invoiceId,
        schoolId: invoice.schoolId // Link to same school
      }
    });

    // 3. Update Invoice Status
    const newPaidAmount = Number(invoice.paidAmount) + Number(amount);
    const isFullyPaid = newPaidAmount >= Number(invoice.totalAmount);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? 'PAID' : 'PARTIAL'
      }
    });

    return NextResponse.json(payment, { status: 201 });

  } catch (error) {
    console.error("Payment Error:", error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
