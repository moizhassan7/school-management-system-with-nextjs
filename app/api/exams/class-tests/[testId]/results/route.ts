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

    const results = await prisma.classTestResult.findMany({
      where: { classTestId: testId },
      include: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        student: {
          rollNumber: 'asc'
        }
      }
    });

    return NextResponse.json(results);
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

    // Verify the class test exists
    const classTest = await prisma.classTest.findUnique({
      where: { id: testId }
    });

    if (!classTest) {
      return NextResponse.json({ error: 'Class test not found' }, { status: 404 });
    }

    // Validate all results
    for (const result of results) {
      if (!result.studentId || result.correctAnswers === undefined) {
        return NextResponse.json({ error: 'Missing required fields in results' }, { status: 400 });
      }

      if (result.correctAnswers < 0 || result.correctAnswers > classTest.totalQuestions) {
        return NextResponse.json({ 
          error: `Correct answers must be between 0 and ${classTest.totalQuestions}` 
        }, { status: 400 });
      }
    }

    // Use a transaction to handle all results
    const updatedResults = await prisma.$transaction(async (tx) => {
      const updatedResults = [];

      for (const resultData of results) {
        const { studentId, correctAnswers, remarks } = resultData;
        
        // Calculate status based on passing threshold
        const status = correctAnswers >= classTest.passingQuestions ? 'PASS' : 'FAIL';

        // Check if result already exists
        const existingResult = await tx.classTestResult.findUnique({
          where: {
            studentId_classTestId: {
              studentId,
              classTestId: testId
            }
          }
        });

        if (existingResult) {
          // Update existing result
          const updated = await tx.classTestResult.update({
            where: { id: existingResult.id },
            data: {
              correctAnswers,
              status,
              remarks: remarks || null
            },
            include: {
              student: {
                select: {
                  id: true,
                  rollNumber: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          });
          updatedResults.push(updated);
        } else {
          // Create new result
          const created = await tx.classTestResult.create({
            data: {
              studentId,
              classTestId: testId,
              correctAnswers,
              status,
              remarks: remarks || null
            },
            include: {
              student: {
                select: {
                  id: true,
                  rollNumber: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          });
          updatedResults.push(created);
        }
      }

      return updatedResults;
    });

    return NextResponse.json(updatedResults);
  } catch (error) {
    console.error('Error saving class test results:', error);
    return NextResponse.json({ error: 'Failed to save class test results' }, { status: 500 });
  }
}