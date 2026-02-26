import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/configurations/[configurationId] - Get specific exam configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ configurationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configurationId } = await params;

    const configuration = await prisma.examConfiguration.findUnique({
      where: {
        id: configurationId
      },
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
      }
    });

    if (!configuration) {
      return NextResponse.json(
        { error: 'Exam configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error fetching exam configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/exams/configurations/[configurationId] - Update exam configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ configurationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configurationId } = await params;

    const body = await request.json();
    const { maxMarks, passMarks, questions } = body;

    if (maxMarks === undefined || passMarks === undefined) {
      return NextResponse.json(
        { error: 'maxMarks and passMarks are required' },
        { status: 400 }
      );
    }

    if (passMarks > maxMarks) {
      return NextResponse.json(
        { error: 'Pass marks cannot be greater than maximum marks' },
        { status: 400 }
      );
    }

    // Check if configuration has existing results
    const resultCount = await prisma.examResult.count({
      where: {
        examId: (await prisma.examConfiguration.findUnique({
          where: { id: configurationId },
          select: { examId: true }
        }))?.examId || '',
        subjectId: (await prisma.examConfiguration.findUnique({
          where: { id: configurationId },
          select: { subjectId: true }
        }))?.subjectId || '',
        classId: (await prisma.examConfiguration.findUnique({
          where: { id: configurationId },
          select: { classId: true }
        }))?.classId || ''
      }
    });

    if (resultCount > 0) {
      return NextResponse.json(
        { error: 'Cannot modify configuration that has existing results' },
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

    // Start a transaction to update configuration and questions
    const updatedConfiguration = await prisma.$transaction(async (tx) => {
      // Delete existing questions if new questions are provided
      if (questions && questions.length > 0) {
        await tx.questionDefinition.deleteMany({
          where: {
            examConfigId: configurationId
          }
        });
      }

      // Update configuration
      return await tx.examConfiguration.update({
        where: {
          id: configurationId
        },
        data: {
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
    });

    return NextResponse.json(updatedConfiguration);
  } catch (error) {
    console.error('Error updating exam configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update exam configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/exams/configurations/[configurationId] - Delete exam configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ configurationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configurationId } = await params;

    // Check if configuration has existing results
    const config = await prisma.examConfiguration.findUnique({
      where: { id: configurationId },
      select: { examId: true, subjectId: true, classId: true }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Exam configuration not found' },
        { status: 404 }
      );
    }

    const resultCount = await prisma.examResult.count({
      where: {
        examId: config.examId,
        subjectId: config.subjectId,
        classId: config.classId
      }
    });

    if (resultCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete configuration that has existing results' },
        { status: 400 }
      );
    }

    await prisma.examConfiguration.delete({
      where: {
        id: configurationId
      }
    });

    return NextResponse.json({ message: 'Exam configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete exam configuration' },
      { status: 500 }
    );
  }
}