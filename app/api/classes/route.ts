import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/classes - Get all classes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(session.user.role || '');
    let classWhere: any = {
      classGroup: {
        campus: {
          schoolId: session.user.schoolId
        }
      }
    };

    if (role === 'TEACHER') {
      const staff = await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } });
      if (!staff) {
        return NextResponse.json([], { status: 200 });
      }
      const assignments = await prisma.subjectAssignment.findMany({
        where: { teacherId: staff.id },
        select: { classId: true }
      });
      const classIds = Array.from(new Set(assignments.map((a: { classId: string }) => a.classId)));
      classWhere = {
        ...classWhere,
        id: { in: classIds.length ? classIds : ['__none__'] }
      };
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        classGroup: {
          include: {
            campus: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST /api/classes - Create a new class
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, classGroupId } = body;

    if (!name || !classGroupId) {
      return NextResponse.json(
        { error: 'Name and class group are required' },
        { status: 400 }
      );
    }

    const cls = await prisma.class.create({
      data: {
        name,
        classGroupId
      }
    });

    return NextResponse.json(cls, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
