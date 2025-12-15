import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE']),
  remarks: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const { parentId } = await params;
    const body = await request.json();
    const { amount, method, remarks } = paymentSchema.parse(body);

    let remainingPayment = amount;

    // 1. Fetch all children of this parent
    const parentRecord = await prisma.parentRecord.findUnique({
      where: { userId: parentId },
      include: {
        students: {
          include: {
            studentRecord: {
              include: {
                user: {
                  include: {
                    // Get unpaid invoices sorted by Due Date (Oldest First)
                    invoices: {
                      where: {
                        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
                      },
                      orderBy: { dueDate: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!parentRecord) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    // 2. Flatten all invoices from all children into one list
    let allInvoices = parentRecord.students.flatMap(kinship => 
      kinship.studentRecord.user.invoices.map(inv => ({
        ...inv,
        studentName: kinship.studentRecord.user.name
      }))
    );

    // 3. Sort ALL invoices by date (Oldest debt gets paid first, regardless of child)
    allInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // 4. Perform the distribution in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const paymentsMade = [];

      for (const invoice of allInvoices) {
        if (remainingPayment <= 0) break;

        const alreadyPaid = Number(invoice.paidAmount);
        const totalAmount = Number(invoice.totalAmount);
        const dueOnInvoice = totalAmount - alreadyPaid;

        // Determine how much we can pay for THIS invoice
        const amountToPay = Math.min(remainingPayment, dueOnInvoice);

        if (amountToPay > 0) {
          // A. Update Invoice Status
          const newPaidAmount = alreadyPaid + amountToPay;
          const newStatus = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus,
            }
          });

          // B. Record the Transaction
          await tx.payment.create({
            data: {
              amount: amountToPay,
              method: method,
              date: new Date(),
              invoiceId: invoice.id,
              schoolId: invoice.schoolId,
              transactionId: remarks // Optional: Store notes here
            }
          });

          paymentsMade.push({
            invoiceNo: invoice.invoiceNo,
            student: invoice.studentName,
            paid: amountToPay,
            status: newStatus
          });

          // C. Decrease the pot
          remainingPayment -= amountToPay;
        }
      }

      return paymentsMade;
    });

    return NextResponse.json({ 
      success: true, 
      distributedAmount: amount - remainingPayment,
      remainingBalance: remainingPayment, // Any money left over (excess)
      breakdown: results 
    });

  } catch (error) {
    console.error("Payment Distribution Error:", error);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}