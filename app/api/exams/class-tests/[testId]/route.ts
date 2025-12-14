import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Fetch a specific class test
export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;

    const classTest = await prisma.classTest.findUnique({
      where: { id: testId },
      include: {
        subject: true,
        class: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!classTest) {
      return NextResponse.json({ error: 'Class test not found' }, { status: 404 });
    }

    return NextResponse.json(classTest);
  } catch (error) {
    console.error('Error fetching class test:', error);
    return NextResponse.json({ error: 'Failed to fetch class test' }, { status: 500 });
  }
}

// PUT: Update a class test
export async function PUT(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;
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

    // Update the class test
    const classTest = await prisma.classTest.update({
      where: { id: testId },
      data: {
        name,
        subjectId,
        classId,
        date: new Date(date),
        totalQuestions,
        passingQuestions,
        description
      },
      include: {
        subject: true,
        class: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json(classTest);
  } catch (error) {
    console.error('Error updating class test:', error);
    return NextResponse.json({ error: 'Failed to update class test' }, { status: 500 });
  }
}

// DELETE: Delete a class test
export async function DELETE(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;

    // Check if there are any results for this test
    const resultsCount = await prisma.classTestResult.count({
      where: { classTestId: testId }
    });

    if (resultsCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete class test with existing results. Please delete all results first.' 
      }, { status: 400 });
    }

    // Delete the class test
    await prisma.classTest.delete({
      where: { id: testId }
    });

    return NextResponse.json({ message: 'Class test deleted successfully' });
  } catch (error) {
    console.error('Error deleting class test:', error);
    return NextResponse.json({ error: 'Failed to delete class test' }, { status: 500 });
  }
}