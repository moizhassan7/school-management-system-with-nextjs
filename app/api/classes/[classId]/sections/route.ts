import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const sectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const sections = await prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const body = await request.json();
    const validated = sectionSchema.parse(body);

    const section = await prisma.section.create({
      data: {
        name: validated.name,
        classId,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}