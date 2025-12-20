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
    let where: any = {};
    if (role === 'TEACHER') {
      const staff = await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } });
      if (!staff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.teacherId = staff.id;
    }

    const tests = await prisma.classTest.findMany({
      where,
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
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Error fetching class tests:', error);
    return NextResponse.json({ error: 'Failed to fetch class tests' }, { status: 500 });
  }
}

// POST: Create a new class test
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
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

    // Create the class test
    const classTest = await prisma.classTest.create({
      data: {
        name,
        subjectId,
        classId,
        teacherId: role === 'TEACHER'
          ? (await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } }))!.id
          : session.user.id!,
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

    return NextResponse.json(classTest, { status: 201 });
  } catch (error) {
    console.error('Error creating class test:', error);
    return NextResponse.json({ error: 'Failed to create class test' }, { status: 500 });
  }
}
