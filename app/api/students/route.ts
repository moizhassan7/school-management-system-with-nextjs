import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requirePermission, schoolScope, stripSecrets } from '@/lib/authz';

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('STUDENTS', 'VIEW');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get('pageSize') || 25)));
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

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...schoolScope(session),
      studentRecord: hasRecordFilter
        ? { is: studentRecordFilter }
        : { isNot: null },
    };

    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      stripSecrets({
        data: students,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      })
    );
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
