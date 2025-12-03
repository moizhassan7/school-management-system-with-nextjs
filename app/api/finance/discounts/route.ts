import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';

const discountSchema = z.object({
  name: z.string().min(1),
  value: z.number().min(0),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  feeHeadId: z.string().min(1),
  schoolId: z.string().min(1),
});

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const where = role === 'SUPER_ADMIN' ? {} : { schoolId };
    const discounts = await prisma.discount.findMany({
      where,
      include: { feeHead: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(discounts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const data = discountSchema.parse(body);

    const discount = await prisma.discount.create({
      data: {
        name: data.name,
        value: data.value,
        type: data.type,
        feeHeadId: data.feeHeadId,
        schoolId: role === 'SUPER_ADMIN' ? data.schoolId : schoolId,
      }
    });
    return NextResponse.json(discount, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}
