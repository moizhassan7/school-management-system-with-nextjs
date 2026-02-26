import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/configurations - Get all exam configurations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    const where: any = {};
    if (examId) where.examId = examId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const configurations = await prisma.examConfiguration.findMany({
      where,
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            endDate: true
          }
        },
        subject: {
          select: {
            id: true,
            name: true,
            subjectGroup: {
              select: {
                name: true,
                classGroup: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        myClass: {
          select: {
            id: true,
            name: true,
            classGroup: {
              select: {
                name: true
              }
            }
          }
        },
        questions: {
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            // results: true (Removed because results are linked to Exam, not ExamConfiguration)
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Error fetching exam configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam configurations' },
      { status: 500 }
    );
  }
}

// POST /api/exams/configurations - Create a new exam configuration
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { examId, subjectId, classId, maxMarks, passMarks, questions } = body;

    if (!examId || !subjectId || !classId || maxMarks === undefined || passMarks === undefined) {
      return NextResponse.json(
        { error: 'examId, subjectId, classId, maxMarks, and passMarks are required' },
        { status: 400 }
      );
    }

    if (passMarks > maxMarks) {
      return NextResponse.json(
        { error: 'Pass marks cannot be greater than maximum marks' },
        { status: 400 }
      );
    }

    // Validate questions if provided
    if (questions && Array.isArray(questions)) {
      const totalQuestionMarks = questions.reduce((sum: number, q: any) => sum + (q.maxMarks || 0), 0);
      if (totalQuestionMarks !== maxMarks) {
        return NextResponse.json(
          { error: 'Total question marks must equal maximum marks' },
          { status: 400 }
        );
      }

      // Validate question structure
      for (const question of questions) {
        if (!question.label || question.maxMarks === undefined || question.order === undefined) {
          return NextResponse.json(
            { error: 'Each question must have label, maxMarks, and order' },
            { status: 400 }
          );
        }
      }
    }

    const configuration = await prisma.examConfiguration.create({
      data: {
        examId,
        subjectId,
        classId,
        maxMarks,
        passMarks,
        questions: questions && questions.length > 0 ? {
          create: questions.map((q: any) => ({
            label: q.label,
            maxMarks: q.maxMarks,
            order: q.order
          }))
        } : undefined
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        subject: {
          select: {
            id: true,
            name: true
          }
        },
        myClass: {
          select: {
            id: true,
            name: true
          }
        },
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error('Error creating exam configuration:', error);
    if (error instanceof Error && (error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Exam configuration already exists for this exam, subject, and class' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create exam configuration' },
      { status: 500 }
    );
  }
}