import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const heads = await prisma.accountHead.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(heads);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch account heads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const head = await prisma.accountHead.create({
      data: { name: body.name, schoolId: body.schoolId }
    });
    return NextResponse.json(head, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create account head' }, { status: 500 });
  }
}