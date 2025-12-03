import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(), // e.g. PHY-101
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectGroupId: string }> }
) {
  try {
    const { subjectGroupId } = await params;
    const subjects = await prisma.subject.findMany({
      where: { subjectGroupId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectGroupId: string }> }
) {
  try {
    const { subjectGroupId } = await params;
    const body = await request.json();
    const validated = subjectSchema.parse(body);

    const subject = await prisma.subject.create({
      data: {
        name: validated.name,
        // code: validated.code, // Uncomment if you added 'code' to schema
        subjectGroupId,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}