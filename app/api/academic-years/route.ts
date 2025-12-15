import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/academic-years - Get all academic years for the school
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const academicYears = await prisma.academicYear.findMany({
      where: {
        schoolId: session.user.schoolId
      },
      orderBy: {
        startYear: 'desc'
      }
    });

    return NextResponse.json(academicYears);
  } catch (error) {
    console.error('Error fetching academic years:', error);
    return NextResponse.json(
      { error: 'Failed to fetch academic years' },
      { status: 500 }
    );
  }
}

// POST /api/academic-years - Create a new academic year
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startYear, stopYear } = body;

    if (!startYear || !stopYear) {
      return NextResponse.json(
        { error: 'startYear and stopYear are required' },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        startYear,
        stopYear,
        schoolId: session.user.schoolId
      }
    });

    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    console.error('Error creating academic year:', error);
    return NextResponse.json(
      { error: 'Failed to create academic year' },
      { status: 500 }
    );
  }
}