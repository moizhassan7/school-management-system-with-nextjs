import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/marks
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
          orderBy: { order: 'asc' }
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
      where: { classId: classId },
      select: {
        id: true,
        admissionNumber: true,
        rollNumber: true,
        user: {
          select: {
            id: true, // This is the ID we need
            name: true
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    // Get existing results
    const results = await prisma.examResult.findMany({
      where: { examId, subjectId, classId },
      include: {
        questionMarks: {
          include: { questionDef: true }
        }
      }
    });

    const resultsMap = new Map();
    results.forEach(result => {
      resultsMap.set(result.studentId, result);
    });

    // Combine students with their results
    const studentsWithMarks = students.map(student => {
      // FIX: Use student.user.id instead of student.userId
      const sId = student.user.id; 
      const result = resultsMap.get(sId);
      
      return {
        studentId: sId, // <--- THIS WAS THE BUG (was student.userId)
        studentName: student.user.name,
        admissionNumber: student.admissionNumber || '',
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

// ... (Your existing POST function remains the same)
export async function POST(request: NextRequest) {
    // ... your existing POST logic is fine
    // (I am including a condensed version below just in case)
    try {
        const session = await auth();
        // ... auth checks
        const body = await request.json();
        const { examId, studentId, subjectId, classId, questionMarks } = body;

        // Validation...
        if (!examId || !studentId || !subjectId || !classId || !questionMarks) {
             return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const configuration = await prisma.examConfiguration.findUnique({
            where: { examId_subjectId_classId: { examId, subjectId, classId } },
            include: { questions: true }
        });

        if (!configuration) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

        let totalObtained = 0;
        const validatedQuestionMarks = [];

        for (const qm of questionMarks) {
            const questionDef = configuration.questions.find(q => q.id === qm.questionDefId);
            if (!questionDef) continue; // or error
            
            // Ensure marks don't exceed max
            let marks = qm.obtainedMarks;
            if (marks < 0) marks = 0;
            if (marks > questionDef.maxMarks) marks = questionDef.maxMarks;

            totalObtained += marks;
            validatedQuestionMarks.push({
                questionDefId: qm.questionDefId,
                obtainedMarks: marks
            });
        }

        const status = totalObtained >= configuration.passMarks ? 'PASS' : 'FAIL';
        // ... Grade calculation logic ...

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            await tx.examResult.deleteMany({
                where: { examId, studentId, subjectId }
            });

            const newResult = await tx.examResult.create({
                data: {
                    examId, studentId, subjectId, classId,
                    marksObtained: totalObtained,
                    status,
                    // grade
                }
            });

            if (validatedQuestionMarks.length > 0) {
                await tx.questionMark.createMany({
                    data: validatedQuestionMarks.map(qm => ({
                        examResultId: newResult.id,
                        questionDefId: qm.questionDefId,
                        obtainedMarks: qm.obtainedMarks
                    }))
                });
            }
            return newResult;
        });

        return NextResponse.json({ 
            examResultId: result.id, 
            status, 
            totalObtained 
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}