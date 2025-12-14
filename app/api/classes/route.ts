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

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;

    const classes = await prisma.class.findMany({
      where,
      include: {
        academicYear: true,
        classGroup: true
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
    const { name, academicYearId, classGroupId } = body;

    if (!name || !academicYearId) {
      return NextResponse.json(
        { error: 'Name and academic year are required' },
        { status: 400 }
      );
    }

    const cls = await prisma.class.create({
      data: {
        name,
        academicYearId,
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