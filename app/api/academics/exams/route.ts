import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const examSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  academicYearId: z.string().min(1),
  schoolId: z.string().min(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  if(!schoolId) return NextResponse.json([]);

  const exams = await prisma.exam.findMany({
    where: { schoolId },
    include: { academicYear: true },
    orderBy: { startDate: 'desc' }
  });
  return NextResponse.json(exams);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = examSchema.parse(body);

    const exam = await prisma.exam.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        academicYearId: data.academicYearId,
        schoolId: data.schoolId,
      }
    });
    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}