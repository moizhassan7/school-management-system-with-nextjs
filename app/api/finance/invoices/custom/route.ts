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

    // 2. Prevent accidental duplicate challan for same month/year
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);
    const existingSamePeriod = await prisma.invoice.findFirst({
      where: {
        studentId,
        month: monthInt,
        year: yearInt,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: { invoiceNo: true },
    });

    if (existingSamePeriod && !cancelInvoiceNo) {
      return NextResponse.json(
        {
          error:
            'This student already has an unpaid challan for the selected month. Cancel previous challan by barcode or clear dues first.',
          invoiceNo: existingSamePeriod.invoiceNo,
        },
        { status: 409 }
      );
    }

    // 3. Build final invoice items and auto-add arrears from pending dues
    const finalItems = [...items];
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        studentId,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    const pendingArrears = pendingInvoices.reduce(
      (sum, inv) => sum + Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0)),
      0
    );

    if (pendingArrears > 0) {
      let arrearsHead = await prisma.feeHead.findFirst({
        where: {
          schoolId,
          name: { equals: 'Arrears', mode: 'insensitive' },
        },
      });

      if (!arrearsHead) {
        arrearsHead = await prisma.feeHead.create({
          data: {
            schoolId,
            name: 'Arrears',
            type: 'ONE_TIME',
          },
        });
      }

      const alreadyIncluded = finalItems.some((item: any) => item.feeHeadId === arrearsHead.id);
      if (!alreadyIncluded) {
        finalItems.push({
          feeHeadId: arrearsHead.id,
          amount: pendingArrears,
        });
      }
    }

    // 4. Create New Invoice
    const totalAmount = finalItems.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    // Use a timestamp suffix for uniqueness
    const invoiceNo = `INV-${yearInt}${monthInt.toString().padStart(2, '0')}-${studentRecord.admissionNumber}-${Date.now().toString().slice(-6)}`;

    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        month: monthInt,
        year: yearInt,
        dueDate: new Date(dueDate),
        invoiceNo,
        totalAmount,
        status: 'UNPAID',
        items: {
            create: finalItems.map((item: any) => ({
                feeHeadId: item.feeHeadId,
                amount: item.amount,
                originalAmount: item.amount,
            }))
        }
      },
      include: {
        items: {
          include: {
            feeHead: true,
          },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create challan" }, { status: 500 });
  }
}