import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const classId = searchParams.get('classId');

    if (!examId || !classId) {
      return NextResponse.json({ error: "Exam and Class are required" }, { status: 400 });
    }

    // 1. Fetch Exam & Class Details (including Grading System)
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        classGroup: {
          include: {
            campus: { include: { school: true } },
            subjectGroups: { include: { subjects: true } },
            gradeSystem: { include: { ranges: { orderBy: { minPercent: 'desc' } } } }
          }
        }
      }
    });

    if (!classData) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    // 2. Fetch Exam Configuration (Max Marks)
    const configs = await prisma.examConfiguration.findMany({
      where: { examId, classId }
    });

    // 3. Fetch All Students
    const students = await prisma.studentRecord.findMany({
      where: { classId },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });

    // 4. Fetch All Results
    const results = await prisma.examResult.findMany({
      where: { examId, classId }
    });

    // 5. Fetch Grade System (Optional: Retrieve manually if not linked in schema yet)
    // For safety, let's fetch the first available grade system for this school if specific link is missing
    const gradeSystem = classData.classGroup.gradeSystem || await prisma.gradeSystem.findFirst({
        where: { schoolId: classData.classGroup.campus.schoolId },
        include: { ranges: { orderBy: { minPercent: 'desc' } } }
    }) || { ranges: [] };

    // --- PROCESSING LOGIC ---
    
    const reportData = students.map(record => {
      let totalMax = 0;
      let totalObtained = 0;
      
    const subjects = Array.from(new Map(
      (classData.classGroup.subjectGroups.flatMap(sg => sg.subjects) || []).map(s => [s.id, s])
    ).values());

    const subjectResults = subjects.map(sub => {
        // Find config for max marks (default 100)
        const config = configs.find(c => c.subjectId === sub.id);
        const maxMarks = config ? config.maxMarks : 100;
        const passMarks = config ? config.passMarks : 40;

        // Find result
        const result = results.find(r => r.subjectId === sub.id && r.studentId === record.userId);
        const obtained = result ? result.marksObtained : 0; // Or treat null as absent

        totalMax += maxMarks;
        totalObtained += obtained;

        return {
          subjectName: sub.name,
          maxMarks,
          passMarks,
          obtained,
          status: obtained >= passMarks ? 'PASS' : 'FAIL'
        };
      });

      // Calculate Aggregate
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      
      // Calculate Grade
      const grade = gradeSystem.ranges.find(
        range => percentage >= range.minPercent && percentage <= range.maxPercent
      );

      return {
        studentId: record.userId,
        studentName: record.user.name,
        admissionNo: record.admissionNumber,
        subjects: subjectResults,
        summary: {
          totalMax,
          totalObtained,
          percentage: percentage.toFixed(2),
          grade: grade ? grade.name : 'N/A',
          result: grade?.name === 'F' ? 'FAIL' : 'PASS' // Simple logic
        }
      };
    });

    return NextResponse.json(reportData);

  } catch (error) {
    console.error("Report Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
