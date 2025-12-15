import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/results - Get class results for gazette
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const classId = searchParams.get('classId');

    if (!examId || !classId) {
      return NextResponse.json(
        { error: 'examId and classId are required' },
        { status: 400 }
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

    // Get class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        classGroup: true
      }
    });

    if (!classDetails) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get all students in the class
    const students = await prisma.studentRecord.findMany({
      where: {
        classId: classId
      },
      select: {
        id: true,
        admissionNumber: true,
        rollNumber: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });

    // Get all subjects for this class through subject groups
    const subjectGroups = await prisma.subjectGroup.findMany({
      where: {
        classGroupId: classDetails.classGroupId
      },
      include: {
        subjects: true
      }
    });

    const subjects = subjectGroups.flatMap(sg => sg.subjects);

    // Get all results for this exam and class
    const results = await prisma.examResult.findMany({
      where: {
        examId,
        classId
      },
      include: {
        subject: true
      }
    });

    // Get configurations for this exam and class to resolve max/pass marks per subject
    const configurations = await prisma.examConfiguration.findMany({
      where: { examId, classId },
      include: { questions: true, subject: true }
    });
    const configBySubject = new Map<string, { maxMarks: number; passMarks: number }>();
    configurations.forEach(c => {
      configBySubject.set(c.subjectId, { maxMarks: c.maxMarks, passMarks: c.passMarks });
    });

    // Get grading system for the class
    const classGroup = await prisma.classGroup.findUnique({
      where: { id: classDetails.classGroupId },
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

    // Process results for each student
    const studentsWithResults = students.map(student => {
      const studentResults = results.filter(r => r.studentId === student.userId);
      
      const subjectsData = subjects.map(subject => {
        const result = studentResults.find(r => r.subjectId === subject.id);
        const cfg = configBySubject.get(subject.id);
        const maxMarks = cfg?.maxMarks ?? 100;
        const passMarks = cfg?.passMarks ?? Math.round(maxMarks * 0.4);
        return {
          subjectName: subject.name,
          subjectCode: (subject as any).code || '',
          subjectId: subject.id,
          obtained: result?.marksObtained || 0,
          maxMarks,
          passMarks,
          status: result?.status || 'NOT_ENTERED',
          grade: result?.grade || null
        };
      });

      // Calculate totals
      const totalObtained = subjectsData.reduce((sum, s) => sum + s.obtained, 0);
      const totalMax = subjectsData.reduce((sum, s) => sum + s.maxMarks, 0);
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

      // Determine overall grade
      let overallGrade = null;
      if (classGroup?.gradeSystem) {
        const gradeRange = classGroup.gradeSystem.ranges.find(
          range => percentage >= range.minPercent && percentage <= range.maxPercent
        );
        overallGrade = gradeRange?.name || null;
      }

      return {
        studentId: student.userId,
        studentName: student.user.name,
        admissionNo: student.user.admissionNumber,
        subjects: subjectsData,
        summary: {
          totalObtained,
          totalMax,
          percentage,
          grade: overallGrade
        }
      };
    });

    // Calculate class statistics
    const classStats = {
      totalStudents: students.length,
      studentsWithResults: studentsWithResults.filter(s => 
        s.subjects.some(sub => sub.status !== 'NOT_ENTERED')
      ).length,
      passCount: studentsWithResults.filter(s => 
        s.subjects.every(sub => sub.status === 'PASS' || sub.status === 'NOT_ENTERED')
      ).length,
      failCount: studentsWithResults.filter(s => 
        s.subjects.some(sub => sub.status === 'FAIL')
      ).length,
      averagePercentage: studentsWithResults.length > 0 
        ? studentsWithResults.reduce((sum, s) => sum + s.summary.percentage, 0) / studentsWithResults.length 
        : 0
    };

    return NextResponse.json({
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        startDate: exam.startDate,
        endDate: exam.endDate,
        academicYear: exam.academicYear
      },
      class: {
        id: classDetails.id,
        name: classDetails.name,
        classGroup: classDetails.classGroup.name
      },
      students: studentsWithResults,
      statistics: classStats,
      gradingSystem: classGroup?.gradeSystem || null
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
