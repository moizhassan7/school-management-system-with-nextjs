import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/report-card - Get individual student report card
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const examId = searchParams.get('examId');

    if (!studentId || !examId) {
      return NextResponse.json(
        { error: 'studentId and examId are required' },
        { status: 400 }
      );
    }

    // Get student details
    const student = await prisma.studentRecord.findUnique({
      where: {
        userId: studentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            profilePath: true
          }
        },
        myClass: {
          include: {
            classGroup: true
          }
        },
        section: true
      }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        academicYear: true
      }
    });

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Get student's subject group
    const subjectGroup = await prisma.subjectGroup.findFirst({
      where: {
        students: {
          some: {
            userId: studentId
          }
        }
      },
      include: {
        subjects: true
      }
    });

    // Get all results for this student and exam
    const results = await prisma.examResult.findMany({
      where: {
        examId,
        studentId
      },
      include: {
        subject: true,
        questionMarks: {
          include: {
            questionDef: true
          }
        }
      }
    });

    // Get grading system for the class
    const classGroup = await prisma.classGroup.findUnique({
      where: { id: student.myClass.classGroupId },
      include: {
        gradeSystem: {
          include: {
            ranges: {
              orderBy: {
                minPercent: 'desc'
              }
            }
          }
        }
      }
    });

    // Resolve configurations for this exam and student's class
    const configurations = await prisma.examConfiguration.findMany({
      where: { examId, classId: student.myClass.id },
      include: { subject: true, questions: true }
    });
    const configBySubject = new Map<string, { maxMarks: number; passMarks: number }>();
    configurations.forEach(c => {
      configBySubject.set(c.subjectId, { maxMarks: c.maxMarks, passMarks: c.passMarks });
    });

    const subjects = subjectGroup?.subjects.map(subject => {
      const result = results.find(r => r.subjectId === subject.id);
      const cfg = configBySubject.get(subject.id);
      const maxMarks = cfg?.maxMarks ?? 100;
      const passMarks = cfg?.passMarks ?? Math.round(maxMarks * 0.4);
      const percentage = result ? (result.marksObtained / maxMarks) * 100 : 0;
      
      let grade = null;
      if (classGroup?.gradeSystem && result) {
        const gradeRange = classGroup.gradeSystem.ranges.find(
          range => percentage >= range.minPercent && percentage <= range.maxPercent
        );
        grade = gradeRange?.name || null;
      }

      return {
        subjectName: subject.name,
        subjectId: subject.id,
        obtainedMarks: result?.marksObtained || 0,
        maxMarks,
        passMarks,
        percentage,
        status: result?.status || 'NOT_ENTERED',
        grade,
        questionBreakdown: result?.questionMarks.map(qm => ({
          questionLabel: qm.questionDef.label,
          obtained: qm.obtainedMarks,
          maxMarks: qm.questionDef.maxMarks
        })) || []
      };
    }) || [];

    // Calculate totals
    const totalObtained = subjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
    const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
    const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    // Determine overall grade
    let overallGrade = null;
    if (classGroup?.gradeSystem) {
      const gradeRange = classGroup.gradeSystem.ranges.find(
        range => overallPercentage >= range.minPercent && overallPercentage <= range.maxPercent
      );
      overallGrade = gradeRange?.name || null;
    }

    // Get previous exam results for comparison (optional)
    const previousExams = await prisma.exam.findMany({
      where: {
        academicYearId: exam.academicYearId,
        id: {
          not: examId
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      take: 2
    });

    const previousResults = await Promise.all(
      previousExams.map(async (prevExam) => {
        const prevResults = await prisma.examResult.findMany({
          where: {
            examId: prevExam.id,
            studentId
          },
          include: {
            subject: true
          }
        });

        const prevTotal = prevResults.reduce((sum, r) => sum + r.marksObtained, 0);
        const prevPercentage = prevResults.length > 0 ? (prevTotal / (prevResults.length * 100)) * 100 : 0;

        return {
          examName: prevExam.name,
          percentage: prevPercentage,
          totalMarks: prevTotal
        };
      })
    );

    return NextResponse.json({
      student: {
        id: student.user.id,
        name: student.user.name,
        admissionNumber: student.user.admissionNumber,
        profilePath: student.user.profilePath,
        class: student.myClass.name,
        section: student.section?.name || null,
        classGroup: student.myClass.classGroup.name
      },
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        startDate: exam.startDate,
        endDate: exam.endDate,
        academicYear: exam.academicYear
      },
      subjects,
      summary: {
        totalObtained,
        totalMax,
        percentage: overallPercentage,
        grade: overallGrade
      },
      gradingSystem: classGroup?.gradeSystem || null,
      previousResults: previousResults.filter(r => r.totalMarks > 0),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching report card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report card' },
      { status: 500 }
    );
  }
}
