import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Fetch all class tests
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(session.user.role || '');
    let teacherFilter: any = {};
    if (role === 'TEACHER') {
      const staff = await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } });
      if (!staff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      teacherFilter = {
        configurations: {
          some: {
            myClass: {
              subjectAssignments: {
                some: { teacherId: staff.id }
              }
            }
          }
        }
      };
    }

    const exams = await prisma.exam.findMany({
      where: {
        schoolId: session.user.schoolId!,
        type: 'CLASS_TEST',
        ...teacherFilter
      },
      include: {
        configurations: {
          include: {
            subject: true,
            myClass: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    const mappedTests = exams.map(exam => {
      const config = exam.configurations[0];
      return {
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
    });

    return NextResponse.json(mappedTests);
  } catch (error) {
    console.error('Error fetching class tests:', error);
    return NextResponse.json({ error: 'Failed to fetch class tests' }, { status: 500 });
  }
}

// POST: Create a new class test
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const role = String(session.user.role || '');
    if (role === 'TEACHER') {
      const staff = await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } });
      if (!staff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const assignment = await prisma.subjectAssignment.findFirst({
        where: { teacherId: staff.id, subjectId, classId }
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId: session.user.schoolId! },
      orderBy: { startYear: 'desc' }
    });

    if (!activeYear) {
      return NextResponse.json({ error: 'No active academic year found' }, { status: 400 });
    }

    // Create the Exam instead of classTest
    const exam = await prisma.exam.create({
      data: {
        name,
        type: 'CLASS_TEST',
        startDate: new Date(date),
        endDate: new Date(date),
        academicYearId: activeYear.id,
        schoolId: session.user.schoolId!,
        configurations: {
          create: {
            subjectId,
            classId,
            maxMarks: totalQuestions,
            passMarks: passingQuestions
          }
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

    const config = exam.configurations[0];
    const mappedResponse = {
      id: exam.id,
      name: exam.name,
      subjectId: config.subjectId,
      classId: config.classId,
      date: exam.startDate,
      totalQuestions: config.maxMarks,
      passingQuestions: config.passMarks,
      description: null,
      subject: config.subject,
      class: config.myClass,
      teacher: null
    };

    return NextResponse.json(mappedResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating class test:', error);
    return NextResponse.json({ error: 'Failed to create class test' }, { status: 500 });
  }
}
