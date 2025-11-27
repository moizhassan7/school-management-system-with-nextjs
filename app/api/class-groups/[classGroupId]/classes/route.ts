import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classGroupId: string }> }
) {
  try {
    const { classGroupId } = await params;
    const classes = await prisma.class.findMany({
      where: {
        classGroupId: classGroupId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classGroupId: string }> }
) {
  try {
    const { classGroupId } = await params;
    const json = await request.json();
    const { name } = json;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        classGroupId: classGroupId,
      },
    });

    return NextResponse.json(newClass);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
