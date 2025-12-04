import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  if (!classId) return NextResponse.json([]);

  // Get subjects available for this class via its class group's subject groups
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      classGroup: {
        include: {
          subjectGroups: {
            include: { subjects: true }
          }
        }
      }
    }
  });

  if (!classData) return NextResponse.json([]);

  // Get existing configs
  const configs = await prisma.examConfiguration.findMany({
    where: { examId, classId }
  });

  // Build unique subject list across all subject groups in this class group
  const subjects = Array.from(new Map(
    (classData.classGroup.subjectGroups.flatMap(sg => sg.subjects) || []).map(s => [s.id, s])
  ).values());

  // Merge subjects with existing config (or default)
  const result = subjects.map(subject => {
    const config = configs.find(c => c.subjectId === subject.id);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      maxMarks: config?.maxMarks || 100,
      passMarks: config?.passMarks || 40,
    };
  });

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const { classId, configs } = await request.json(); // configs = [{ subjectId, maxMarks, passMarks }]

    const operations = configs.map((c: any) => 
      prisma.examConfiguration.upsert({
        where: { examId_subjectId_classId: { examId, classId, subjectId: c.subjectId } },
        create: { examId, classId, subjectId: c.subjectId, maxMarks: Number(c.maxMarks), passMarks: Number(c.passMarks) },
        update: { maxMarks: Number(c.maxMarks), passMarks: Number(c.passMarks) }
      })
    );

    await prisma.$transaction(operations);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
