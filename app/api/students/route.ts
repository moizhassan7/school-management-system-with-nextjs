import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const students = await prisma.user.findMany({
      where: {
        studentRecord: {
          isNot: null // Filter for users who are students
        },
        deletedAt: null,
      },
      include: {
        school: {
          select: {
            name: true,
            initials: true
          }
        },
        studentRecord: {
          include: {
            myClass: true, // Include Class details
            section: true, // Include Section details
            academicYearRecords: {
              include: {
                academicYear: true // Include Session Year details
              },
              orderBy: {
                createdAt: 'desc' // Get latest session
              },
              take: 1
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}