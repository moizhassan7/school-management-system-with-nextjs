import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/marks - Get marks for specific exam, class, and subject
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

    if (!examId || !classId || !subjectId) {
      return NextResponse.json(
        { error: 'examId, classId, and subjectId are required' },
        { status: 400 }
      );
    }

    // Get exam configuration
    const configuration = await prisma.examConfiguration.findUnique({
      where: {
        examId_subjectId_classId: {
          examId,
          subjectId,
          classId
        }
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc'
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

    // Get all students in the class
    const students = await prisma.studentRecord.findMany({
      where: {
        myClassId: classId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            admissionNumber: true
          }
        }
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });

    // Get existing results for these students
    const results = await prisma.examResult.findMany({
      where: {
        examId,
        subjectId,
        classId
      },
      include: {
        questionMarks: {
          include: {
            questionDef: true
          }
        }
      }
    });

    // Create a map of existing results
    const resultsMap = new Map();
    results.forEach(result => {
      resultsMap.set(result.studentId, result);
    });

    // Combine students with their results
    const studentsWithMarks = students.map(student => {
      const result = resultsMap.get(student.userId);
      return {
        studentId: student.userId,
        studentName: student.user.name,
        admissionNumber: student.user.admissionNumber,
        resultId: result?.id,
        totalObtained: result?.marksObtained || 0,
        status: result?.status,
        grade: result?.grade,
        questionMarks: result?.questionMarks || []
      };
    });

    return NextResponse.json({
      configuration,
      students: studentsWithMarks
    });
  } catch (error) {
    console.error('Error fetching marks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marks' },
      { status: 500 }
    );
  }
}

// POST /api/exams/marks - Submit student marks
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { examId, studentId, subjectId, classId, questionMarks } = body;

    if (!examId || !studentId || !subjectId || !classId || !questionMarks || !Array.isArray(questionMarks)) {
      return NextResponse.json(
        { error: 'examId, studentId, subjectId, classId, and questionMarks are required' },
        { status: 400 }
      );
    }

    // Get exam configuration
    const configuration = await prisma.examConfiguration.findUnique({
      where: {
        examId_subjectId_classId: {
          examId,
          subjectId,
          classId
        }
      },
      include: {
        questions: true
      }
    });

    if (!configuration) {
      return NextResponse.json(
        { error: 'Exam configuration not found' },
        { status: 404 }
      );
    }

    // Validate question marks
    let totalObtained = 0;
    const validatedQuestionMarks = [];

    for (const qm of questionMarks) {
      const questionDef = configuration.questions.find(q => q.id === qm.questionDefId);
      if (!questionDef) {
        return NextResponse.json(
          { error: `Invalid question definition ID: ${qm.questionDefId}` },
          { status: 400 }
        );
      }

      if (qm.obtainedMarks < 0 || qm.obtainedMarks > questionDef.maxMarks) {
        return NextResponse.json(
          { error: `Marks for ${questionDef.label} must be between 0 and ${questionDef.maxMarks}` },
          { status: 400 }
        );
      }

      totalObtained += qm.obtainedMarks;
      validatedQuestionMarks.push({
        questionDefId: qm.questionDefId,
        obtainedMarks: qm.obtainedMarks
      });
    }

    // Calculate status and grade
    const status = totalObtained >= configuration.passMarks ? 'PASS' : 'FAIL';
    
    // Get grading system for the class
    const classGroup = await prisma.classGroup.findFirst({
      where: {
        classes: {
          some: {
            id: classId
          }
        }
      },
      include: {
        gradeSystem: {
          include: {
            ranges: true
          }
        }
      }
    });

    let grade = null;
    const percentage = (totalObtained / configuration.maxMarks) * 100;

    if (classGroup?.gradeSystem) {
      const gradeRange = classGroup.gradeSystem.ranges.find(
        range => percentage >= range.minPercent && percentage <= range.maxPercent
      );
      grade = gradeRange?.name || null;
    }

    // Start transaction to create/update result and question marks
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing result if it exists
      await tx.examResult.deleteMany({
        where: {
          examId,
          studentId,
          subjectId
        }
      });

      // Create new result
      const newResult = await tx.examResult.create({
        data: {
          examId,
          studentId,
          subjectId,
          classId,
          marksObtained: totalObtained,
          status,
          grade
        }
      });

      // Create question marks
      for (const qm of validatedQuestionMarks) {
        await tx.questionMark.create({
          data: {
            examResultId: newResult.id,
            questionDefId: qm.questionDefId,
            obtainedMarks: qm.obtainedMarks
          }
        });
      }

      return newResult;
    });

    return NextResponse.json({
      examResultId: result.id,
      totalObtained,
      totalMax: configuration.maxMarks,
      percentage,
      status,
      grade
    });
  } catch (error) {
    console.error('Error submitting marks:', error);
    return NextResponse.json(
      { error: 'Failed to submit marks' },
      { status: 500 }
    );
  }
}