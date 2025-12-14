import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const heads = await prisma.feeHead.findMany({
    include: { accountSubHead: true }, // Include the parent subhead info
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(heads);
}

export async function POST(req: Request) {
  const body = await req.json();
  const head = await prisma.feeHead.create({
    data: { 
      name: body.name, 
      schoolId: body.schoolId, 
      type: body.type,
      accountSubHeadId: body.accountSubHeadId // Link to Accounting
    }
  });
  return NextResponse.json(head);
}