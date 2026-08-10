import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const classGroupId = searchParams.get('classGroupId')?.trim() || '';
    const classId = searchParams.get('classId')?.trim() || '';
    const sectionId = searchParams.get('sectionId')?.trim() || '';

    const studentRecordFilter: Prisma.StudentRecordWhereInput = {};

    if (classId) {
      studentRecordFilter.classId = classId;
    } else if (classGroupId) {
      studentRecordFilter.myClass = { classGroupId };
    }

    if (sectionId) {
      studentRecordFilter.sectionId = sectionId;
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
    const hasScopedFilter = !!(classGroupId || classId || sectionId || q);

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
      ...(hasScopedFilter ? { take: q && !classId && !sectionId ? 50 : 200 } : { take: 0 }),
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
