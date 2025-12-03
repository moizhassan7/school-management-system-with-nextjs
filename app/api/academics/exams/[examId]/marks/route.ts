import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId');

  if (!classId || !subjectId) return NextResponse.json([]);

  // Fetch all students in class
  const students = await prisma.studentRecord.findMany({
    where: { classId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: 'asc' } }
  });

  // Fetch existing marks
  const marks = await prisma.examResult.findMany({
    where: { examId, classId, subjectId }
  });

  // Combine
  const result = students.map(record => {
    const markEntry = marks.find(m => m.studentId === record.user.id);
    return {
      studentId: record.user.id,
      studentName: record.user.name,
      marksObtained: markEntry?.marksObtained || '',
      remarks: markEntry?.remarks || ''
    };
  });

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const { classId, subjectId, marks } = await request.json(); // marks = [{ studentId, marksObtained }]

  const operations = marks.map((m: any) => 
    prisma.examResult.upsert({
      where: { examId_studentId_subjectId: { examId, studentId: m.studentId, subjectId } },
      create: { 
        examId, classId, subjectId, studentId: m.studentId, 
        marksObtained: Number(m.marksObtained), 
        remarks: m.remarks 
      },
      update: { 
        marksObtained: Number(m.marksObtained), 
        remarks: m.remarks 
      }
    })
  );

  await prisma.$transaction(operations);
  return NextResponse.json({ success: true });
}