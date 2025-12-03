import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  if(!schoolId) return NextResponse.json([]);

  const years = await prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: { startYear: 'desc' }
  });
  return NextResponse.json(years);
}