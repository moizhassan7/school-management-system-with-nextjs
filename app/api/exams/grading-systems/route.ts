import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/grading-systems - Get all grading systems for the school
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gradingSystems = await prisma.gradeSystem.findMany({
      where: {
        schoolId: session.user.schoolId
      },
      include: {
        ranges: {
          orderBy: {
            minPercent: 'desc'
          }
        },
        _count: {
          select: {
            classGroups: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(gradingSystems);
  } catch (error) {
    console.error('Error fetching grading systems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grading systems' },
      { status: 500 }
    );
  }
}

// POST /api/exams/grading-systems - Create a new grading system
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, ranges } = body;

    if (!name || !ranges || !Array.isArray(ranges) || ranges.length === 0) {
      return NextResponse.json(
        { error: 'Name and ranges are required' },
        { status: 400 }
      );
    }

    // Validate ranges
    for (const range of ranges) {
      if (!range.name || range.minPercent === undefined || range.maxPercent === undefined) {
        return NextResponse.json(
          { error: 'Each range must have name, minPercent, and maxPercent' },
          { status: 400 }
        );
      }
      if (range.minPercent >= range.maxPercent) {
        return NextResponse.json(
          { error: 'minPercent must be less than maxPercent' },
          { status: 400 }
        );
      }
    }

    // Check for overlapping ranges
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const range1 = ranges[i];
        const range2 = ranges[j];
        if (
          (range1.minPercent >= range2.minPercent && range1.minPercent < range2.maxPercent) ||
          (range1.maxPercent > range2.minPercent && range1.maxPercent <= range2.maxPercent)
        ) {
          return NextResponse.json(
            { error: 'Grade ranges cannot overlap' },
            { status: 400 }
          );
        }
      }
    }

    const gradingSystem = await prisma.gradeSystem.create({
      data: {
        name,
        description,
        schoolId: session.user.schoolId,
        ranges: {
          create: ranges.map((range: any) => ({
            name: range.name,
            minPercent: range.minPercent,
            maxPercent: range.maxPercent,
            gradePoint: range.gradePoint || 0,
            color: range.color || '#6b7280'
          }))
        }
      },
      include: {
        ranges: {
          orderBy: {
            minPercent: 'desc'
          }
        }
      }
    });

    return NextResponse.json(gradingSystem, { status: 201 });
  } catch (error) {
    console.error('Error creating grading system:', error);
    return NextResponse.json(
      { error: 'Failed to create grading system' },
      { status: 500 }
    );
  }
}