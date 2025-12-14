import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/exams/grading-systems/[gradingSystemId] - Get specific grading system
export async function GET(
  request: NextRequest,
  { params }: { params: { gradingSystemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gradingSystem = await prisma.gradeSystem.findUnique({
      where: {
        id: params.gradingSystemId,
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
      }
    });

    if (!gradingSystem) {
      return NextResponse.json(
        { error: 'Grading system not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(gradingSystem);
  } catch (error) {
    console.error('Error fetching grading system:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grading system' },
      { status: 500 }
    );
  }
}

// PUT /api/exams/grading-systems/[gradingSystemId] - Update grading system
export async function PUT(
  request: NextRequest,
  { params }: { params: { gradingSystemId: string } }
) {
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

    // Start a transaction to update grading system and ranges
    const updatedGradingSystem = await prisma.$transaction(async (tx) => {
      // Delete existing ranges
      await tx.gradeRange.deleteMany({
        where: {
          gradeSystemId: params.gradingSystemId
        }
      });

      // Update grading system and create new ranges
      return await tx.gradeSystem.update({
        where: {
          id: params.gradingSystemId,
          schoolId: session.user.schoolId
        },
        data: {
          name,
          description,
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
    });

    return NextResponse.json(updatedGradingSystem);
  } catch (error) {
    console.error('Error updating grading system:', error);
    return NextResponse.json(
      { error: 'Failed to update grading system' },
      { status: 500 }
    );
  }
}

// DELETE /api/exams/grading-systems/[gradingSystemId] - Delete grading system
export async function DELETE(
  request: NextRequest,
  { params }: { params: { gradingSystemId: string } }
) {
  try {
    const session = await auth(); 
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if grading system is being used by any class groups
    const classGroupCount = await prisma.classGroup.count({
      where: {
        gradeSystemId: params.gradingSystemId
      }
    });

    if (classGroupCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete grading system that is assigned to class groups' },
        { status: 400 }
      );
    }

    await prisma.gradeSystem.delete({
      where: {
        id: params.gradingSystemId,
        schoolId: session.user.schoolId
      }
    });

    return NextResponse.json({ message: 'Grading system deleted successfully' });
  } catch (error) {
    console.error('Error deleting grading system:', error);
    return NextResponse.json(
      { error: 'Failed to delete grading system' },
      { status: 500 }
    );
  }
}