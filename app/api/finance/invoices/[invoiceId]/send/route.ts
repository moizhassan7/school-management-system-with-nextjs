import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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
        select: { name: true, email: true },
      },
    },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (role !== 'SUPER_ADMIN' && invoice.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Placeholder send flow intentionally disabled for now.
  return NextResponse.json(
    { error: `Email sending is not configured yet for ${invoice.invoiceNo}.` },
    { status: 501 }
  );
}
