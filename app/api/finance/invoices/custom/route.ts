import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { 
      schoolId, 
      studentId, 
      month, 
      year, 
      dueDate, 
      items, 
      cancelInvoiceNo // <--- Changed from cancelPrevious (boolean) to string
    } = await request.json();

    const studentRecord = await prisma.studentRecord.findUnique({
        where: { userId: studentId }
    });

    if (!studentRecord) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // 1. Cancel Specific Invoice by Barcode (if provided)
    if (cancelInvoiceNo) {
        const prevInvoice = await prisma.invoice.findUnique({
            where: { invoiceNo: cancelInvoiceNo }
        });

        if (prevInvoice) {
            // Security check: Ensure we are cancelling an invoice for the SAME student
            if (prevInvoice.studentId !== studentId) {
                return NextResponse.json({ error: "Invoice to cancel does not belong to this student" }, { status: 400 });
            }

            await prisma.invoice.update({
                where: { id: prevInvoice.id },
                data: { status: 'CANCELLED' }
            });
        }
    }

    // 2. Create New Invoice
    const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    // Use a timestamp suffix for uniqueness
    const invoiceNo = `INV-${year}${month.toString().padStart(2, '0')}-${studentRecord.admissionNumber}-${Date.now().toString().slice(-6)}`;

    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        month: parseInt(month),
        year: parseInt(year),
        dueDate: new Date(dueDate),
        invoiceNo,
        totalAmount,
        status: 'UNPAID',
        items: {
            create: items.map((item: any) => ({
                feeHeadId: item.feeHeadId,
                amount: item.amount,
                originalAmount: item.amount,
            }))
        }
      }
    });

    return NextResponse.json(invoice, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create challan" }, { status: 500 });
  }
}