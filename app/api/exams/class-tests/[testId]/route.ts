import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Fetch a specific class test
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id: testId },
      include: {
        configurations: {
          include: {
            subject: true,
            myClass: true
          }
        }
      }
    });

    if (!exam || exam.type !== 'CLASS_TEST') {
      return NextResponse.json({ error: 'Class test not found' }, { status: 404 });
    }

    const config = exam.configurations[0];
    const mappedTest = {
      id: exam.id,
      name: exam.name,
      subjectId: config?.subjectId,
      classId: config?.classId,
      date: exam.startDate,
      totalQuestions: config?.maxMarks || 0,
      passingQuestions: config?.passMarks || 0,
      description: null,
      subject: config?.subject,
      class: config?.myClass,
      teacher: null
    };

    return NextResponse.json(mappedTest);
  } catch (error) {
    console.error('Error fetching class test:', error);
    return NextResponse.json({ error: 'Failed to fetch class test' }, { status: 500 });
  }
}

// PUT: Update a class test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = await params;
    const body = await request.json();
    const { name, subjectId, classId, date, totalQuestions, passingQuestions, description } = body;

    // Validate required fields
    if (!name || !subjectId || !classId || !date || totalQuestions === undefined || passingQuestions === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate numeric fields
    if (totalQuestions <= 0) {
      return NextResponse.json({ error: 'Total questions must be greater than 0' }, { status: 400 });
    }

    if (passingQuestions < 0 || passingQuestions > totalQuestions) {
      return NextResponse.json({ error: 'Passing questions must be between 0 and total questions' }, { status: 400 });
    }

    // Verify subject and class exist
    const [subject, cls] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.class.findUnique({ where: { id: classId } })
    ]);

    if (!subject || !cls) {
      return NextResponse.json({ error: 'Subject or class not found' }, { status: 404 });
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: testId },
      include: { configurations: true }
    });

    if (!existingExam || existingExam.type !== 'CLASS_TEST') {
      return NextResponse.json({ error: 'Class test not found' }, { status: 404 });
    }

    const configId = existingExam.configurations[0]?.id;

    // Update the class test
    const updatedExam = await prisma.exam.update({
      where: { id: testId },
      data: {
        name,
        startDate: new Date(date),
        endDate: new Date(date),
        configurations: {
          update: configId ? {
            where: { id: configId },
            data: {
              subjectId,
              classId,
              maxMarks: totalQuestions,
              passMarks: passingQuestions
            }
          } : undefined
        }
      },
      include: {
        configurations: {
          include: {
            subject: true,
            myClass: true
          }
        }
      }
    });

    const config = updatedExam.configurations[0];
    const mappedResponse = {
      id: updatedExam.id,
      name: updatedExam.name,
      subjectId: config?.subjectId,
      classId: config?.classId,
      date: updatedExam.startDate,
      totalQuestions: config?.maxMarks || 0,
      passingQuestions: config?.passMarks || 0,
      description: null,
      subject: config?.subject,
      class: config?.myClass,
      teacher: null
    };

    return NextResponse.json(mappedResponse);
  } catch (error) {
    console.error('Error updating class test:', error);
    return NextResponse.json({ error: 'Failed to update class test' }, { status: 500 });
  }
}

// DELETE: Delete a class test
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = await params;

    // Check if there are any results for this test
    const resultsCount = await prisma.examResult.count({
      where: { examId: testId }
    });

    if (resultsCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete class test with existing results. Please delete all results first.'
      }, { status: 400 });
    }

    // Delete the class test
    await prisma.exam.delete({
      where: { id: testId }
    });

    return NextResponse.json({ message: 'Class test deleted successfully' });
  } catch (error) {
    console.error('Error deleting class test:', error);
    return NextResponse.json({ error: 'Failed to delete class test' }, { status: 500 });
  }
}