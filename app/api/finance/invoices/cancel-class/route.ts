import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { assertSameSchool, requirePermission } from '@/lib/authz';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

const cancelClassSchema = z.object({
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('FEES', 'DELETE');
    if (error || !session) return error;

    const data = cancelClassSchema.parse(await request.json());
    const denied = assertSameSchool(session, data.schoolId);
    if (denied) return denied;

    const targetClass = await prisma.class.findFirst({
      where: {
        id: data.classId,
        classGroup: { campus: { schoolId: data.schoolId } },
      },
      select: { id: true, name: true },
    });
    if (!targetClass) {
      return NextResponse.json({ error: 'Class not found in the selected school' }, { status: 404 });
    }

    const periodWhere: Prisma.InvoiceWhereInput = {
      schoolId: data.schoolId,
      classId: data.classId,
      month: data.month,
      year: data.year,
      status: { not: 'CANCELLED' },
    };

    const result = await prisma.$transaction(async (tx) => {
      const matched = await tx.invoice.count({ where: periodWhere });
      const cancelled = await tx.invoice.updateMany({
        where: {
          ...periodWhere,
          paidAmount: 0,
          status: { in: ['UNPAID', 'OVERDUE'] },
        },
        data: { status: 'CANCELLED' },
      });

      return { matched, cancelled: cancelled.count };
    });

    if (result.matched === 0) {
      return NextResponse.json(
        { error: 'No active invoices found for this class and month' },
        { status: 404 }
      );
    }

    const skipped = result.matched - result.cancelled;
    const skippedMessage = skipped > 0
      ? ` ${skipped} paid or partially paid invoice${skipped === 1 ? ' was' : 's were'} left unchanged.`
      : '';

    return NextResponse.json({
      success: true,
      cancelled: result.cancelled,
      skipped,
      message: `Cancelled ${result.cancelled} invoice${result.cancelled === 1 ? '' : 's'} for ${targetClass.name}.${skippedMessage}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid class cancellation request' },
        { status: 400 }
      );
    }
    return handleApiError(error, 'Failed to cancel class invoices');
  }
}
