import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams - Get all exams for the school
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

    const exams = await prisma.exam.findMany({
      where,
      include: {
        academicYear: true,
        _count: {
          select: {
            configurations: true,
            results: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

// POST /api/exams - Create a new exam
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, startDate, endDate, academicYearId } = body;

    if (!name || !type || !startDate || !endDate || !academicYearId) {
      return NextResponse.json(
        { error: 'name, type, startDate, endDate, and academicYearId are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Validate academic year exists and belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: session.user.schoolId
      }
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year not found or does not belong to your school' },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.create({
      data: {
        name,
        type,
        startDate: start,
        endDate: end,
        academicYearId,
        schoolId: session.user.schoolId
      },
      include: {
        academicYear: true
      }
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}