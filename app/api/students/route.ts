import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const classId = searchParams.get('classId')?.trim() || '';

    const studentRecordFilter: Prisma.StudentRecordWhereInput = {};

    if (classId) {
      studentRecordFilter.classId = classId;
    }

    if (q) {
      studentRecordFilter.OR = [
        { admissionNumber: { contains: q, mode: 'insensitive' } },
        { rollNumber: { contains: q, mode: 'insensitive' } },
        { user: { id: q } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        {
          parents: {
            some: {
              relationship: 'FATHER',
              parentRecord: {
                user: { name: { contains: q, mode: 'insensitive' } },
              },
            },
          },
        },
      ];
    }

    const hasRecordFilter = Object.keys(studentRecordFilter).length > 0;

    const students = await prisma.user.findMany({
      where: {
        deletedAt: null,
        studentRecord: hasRecordFilter
          ? { is: studentRecordFilter }
          : { isNot: null },
      },
      include: {
        school: {
          select: {
            name: true,
            initials: true,
          },
        },
        studentRecord: {
          include: {
            myClass: true,
            section: true,
            parents: {
              include: {
                parentRecord: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
            academicYearRecords: {
              include: {
                academicYear: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(q ? { take: 50 } : {}),
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
