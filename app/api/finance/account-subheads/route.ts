import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const subheads = await prisma.accountSubHead.findMany({
      include: { head: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(subheads);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subheads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subhead = await prisma.accountSubHead.create({
      data: {
        name: body.name,
        headId: body.headId,
        schoolId: body.schoolId,
      },
    });
    return NextResponse.json(subhead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subhead' }, { status: 500 });
  }
}