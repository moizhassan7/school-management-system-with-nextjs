import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { invoiceId, amount, method, transactionId } = await request.json();

    // 1. Get current invoice state
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const newAmount = Number(amount);
    const currentPaid = Number(invoice.paidAmount);
    const total = Number(invoice.totalAmount);
    
    // Prevent overpayment
    if (currentPaid + newAmount > total) {
        return NextResponse.json({ error: "Amount exceeds pending balance" }, { status: 400 });
    }

    // 2. Database Transaction (Ensure data integrity)
    await prisma.$transaction(async (tx) => {
        // A. Create Payment Record (History)
        await tx.payment.create({
            data: {
                amount: newAmount,
                method: method || 'CASH',
                transactionId: transactionId || null,
                invoiceId: invoiceId,
                schoolId: invoice.schoolId,
                date: new Date()
            }
        });

        // B. Update Invoice Status
        const updatedPaid = currentPaid + newAmount;
        const newStatus = updatedPaid >= total ? 'PAID' : 'PARTIAL';

        await tx.invoice.update({
            where: { id: invoiceId },
            data: {
                paidAmount: updatedPaid,
                status: newStatus
            }
        });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}