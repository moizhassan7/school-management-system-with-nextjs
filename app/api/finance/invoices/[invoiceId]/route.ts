import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canCancelInvoice } from '@/lib/invoice-cancellation';

const updateSchema = z.object({
  action: z.enum(['CANCEL', 'MARK_PAID', 'MARK_UNPAID']),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;

  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentRecord: {
            include: {
              myClass: true,
              section: true,
              parents: {
                include: {
                  parentRecord: {
                    include: {
                      user: { select: { id: true, name: true, phone: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      items: {
        include: {
          feeHead: true,
        },
      },
      payments: true,
    },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (role !== 'SUPER_ADMIN' && invoice.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = updateSchema.parse(await request.json());
    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (role !== 'SUPER_ADMIN' && invoice.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (invoice.status === 'CANCELLED' && action !== 'CANCEL') {
      return NextResponse.json(
        { error: 'Cancelled invoices cannot be reopened; generate a replacement invoice instead' },
        { status: 409 }
      );
    }

    const statusMap: Record<'CANCEL' | 'MARK_PAID' | 'MARK_UNPAID', 'CANCELLED' | 'PAID' | 'UNPAID'> = {
      CANCEL: 'CANCELLED',
      MARK_PAID: 'PAID',
      MARK_UNPAID: 'UNPAID',
    };

    if (action === 'CANCEL') {
      if (!canCancelInvoice(invoice)) {
        return NextResponse.json(
          { error: 'Only unpaid invoices without any received payment can be cancelled' },
          { status: 409 }
        );
      }

      const cancelled = await prisma.invoice.updateMany({
        where: {
          id: invoiceId,
          paidAmount: 0,
          status: { in: ['UNPAID', 'OVERDUE'] },
        },
        data: { status: 'CANCELLED' },
      });

      if (cancelled.count === 0) {
        return NextResponse.json(
          { error: 'The invoice received a payment and can no longer be cancelled' },
          { status: 409 }
        );
      }

      const updated = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      return NextResponse.json(updated);
    }

    const nextStatus = statusMap[action];
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: nextStatus,
        paidAmount: nextStatus === 'PAID' ? invoice.totalAmount : 0,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
