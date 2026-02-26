import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Fetch results for a specific class test
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

    const results = await prisma.examResult.findMany({
      where: { examId: testId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentRecord: {
              select: { rollNumber: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Best fallback since rollNumber is deep
      }
    });

    const mappedResults = results.map(r => ({
      id: r.id,
      classTestId: testId,
      studentId: r.studentId,
      correctAnswers: r.marksObtained,
      status: r.status,
      remarks: null,
      student: {
        id: r.student.id,
        rollNumber: r.student.studentRecord?.rollNumber || null,
        firstName: r.student.name.split(' ')[0] || '',
        lastName: r.student.name.split(' ').slice(1).join(' ') || ''
      }
    }));

    return NextResponse.json(mappedResults);
  } catch (error) {
    console.error('Error fetching class test results:', error);
    return NextResponse.json({ error: 'Failed to fetch class test results' }, { status: 500 });
  }
}

// POST: Create or update results for a class test
export async function POST(
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
    const { results } = body;

    if (!Array.isArray(results)) {
      return NextResponse.json({ error: 'Results must be an array' }, { status: 400 });
    }

    // Verify the exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: testId },
      include: { configurations: true }
    });

    if (!exam || exam.type !== 'CLASS_TEST') {
      return NextResponse.json({ error: 'Class test not found' }, { status: 404 });
    }

    const config = exam.configurations[0];
    if (!config) {
      return NextResponse.json({ error: 'Exam configuration not found' }, { status: 400 });
    }

    // Validate all results
    for (const result of results) {
      if (!result.studentId || result.correctAnswers === undefined) {
        return NextResponse.json({ error: 'Missing required fields in results' }, { status: 400 });
      }

      if (result.correctAnswers < 0 || result.correctAnswers > config.maxMarks) {
        return NextResponse.json({
          error: `Correct answers must be between 0 and ${config.maxMarks}`
        }, { status: 400 });
      }
    }

    // Use a transaction
    const updatedResults = await prisma.$transaction(async (tx) => {
      const mappedDbResults = [];

      for (const resultData of results) {
        const { studentId, correctAnswers } = resultData;

        // Calculate status based on passing threshold
        const status = correctAnswers >= config.passMarks ? 'PASS' : 'FAIL';

        // Check if result already exists
        const existingResult = await tx.examResult.findFirst({
          where: {
            studentId,
            examId: testId,
            subjectId: config.subjectId
          }
        });

        let r;
        if (existingResult) {
          // Update existing result
          r = await tx.examResult.update({
            where: { id: existingResult.id },
            data: {
              marksObtained: correctAnswers,
              status
            },
            include: {
              student: { select: { id: true, name: true, studentRecord: { select: { rollNumber: true } } } }
            }
          });
        } else {
          // Create new result
          r = await tx.examResult.create({
            data: {
              studentId,
              examId: testId,
              classId: config.classId,
              subjectId: config.subjectId,
              marksObtained: correctAnswers,
              status
            },
            include: {
              student: { select: { id: true, name: true, studentRecord: { select: { rollNumber: true } } } }
            }
          });
        }

        mappedDbResults.push({
          id: r.id,
          classTestId: testId,
          studentId: r.studentId,
          correctAnswers: r.marksObtained,
          status: r.status,
          remarks: null,
          student: {
            id: r.student.id,
            rollNumber: r.student.studentRecord?.rollNumber || null,
            firstName: r.student.name.split(' ')[0] || '',
            lastName: r.student.name.split(' ').slice(1).join(' ') || ''
          }
        });
      }

      return mappedDbResults;
    });

    return NextResponse.json(updatedResults);
  } catch (error) {
    console.error('Error saving class test results:', error);
    return NextResponse.json({ error: 'Failed to save class test results' }, { status: 500 });
  }
}
