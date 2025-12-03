import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const rangeSchema = z.object({
  name: z.string(),
  minPercent: z.number(),
  maxPercent: z.number(),
  gradePoint: z.number(),
});

const systemSchema = z.object({
  name: z.string().min(1),
  schoolId: z.string().min(1),
  ranges: z.array(rangeSchema),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  
  if(!schoolId) return NextResponse.json([]);

  const systems = await prisma.gradeSystem.findMany({
    where: { schoolId },
    include: { ranges: { orderBy: { minPercent: 'desc' } } }
  });
  return NextResponse.json(systems);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = systemSchema.parse(body);

    const system = await prisma.gradeSystem.create({
      data: {
        name: data.name,
        schoolId: data.schoolId,
        ranges: {
          create: data.ranges
        }
      },
      include: { ranges: true }
    });

    return NextResponse.json(system, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create grade system" }, { status: 500 });
  }
}