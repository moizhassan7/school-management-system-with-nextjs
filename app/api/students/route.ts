import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requirePermission, schoolScope, stripSecrets } from '@/lib/authz';
import { pageMeta, parsePagination } from '@/lib/pagination';

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('STUDENTS', 'VIEW');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';
    const parsed = parsePagination(searchParams, {
      defaultPageSize: all ? 500 : 25,
      maxPageSize: all ? 500 : 100,
      minPageSize: all ? 1 : 10,
    });
    const page = all ? 1 : parsed.page;
    const pageSize = parsed.pageSize;
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
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          suspended: true,
          schoolId: true,
          studentRecord: {
            select: {
              id: true,
              admissionNumber: true,
              rollNumber: true,
              classId: true,
              myClass: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              parents: {
                select: {
                  relationship: true,
                  parentRecord: {
                    select: { user: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: all ? 0 : (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      stripSecrets({
        data: students,
        ...pageMeta(page, pageSize, total),
        truncated: all && total > students.length,
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
