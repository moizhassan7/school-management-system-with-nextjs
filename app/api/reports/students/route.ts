import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Gender, Prisma } from '@prisma/client';
import { requirePermission, schoolScope, stripSecrets } from '@/lib/authz';
import { pageMeta, parsePagination } from '@/lib/pagination';

const studentSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  gender: true,
  address: true,
  city: true,
  religion: true,
  suspended: true,
  studentRecord: {
    select: {
      id: true,
      admissionNumber: true,
      rollNumber: true,
      admissionDate: true,
      classId: true,
      sectionId: true,
      myClass: {
        select: {
          id: true,
          name: true,
          classGroupId: true,
          classGroup: { select: { id: true, name: true } },
        },
      },
      section: { select: { id: true, name: true } },
      subjectGroup: { select: { id: true, name: true } },
      parents: {
        select: {
          relationship: true,
          isPrimary: true,
          parentRecord: {
            select: {
              cnic: true,
              occupation: true,
              user: { select: { name: true, email: true, phone: true } },
            },
          },
        },
      },
      academicYearRecords: {
        select: {
          academicYear: { select: { startYear: true, stopYear: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    },
  },
} satisfies Prisma.UserSelect;

type ReportUser = Prisma.UserGetPayload<{ select: typeof studentSelect }>;

function formatStudent(u: ReportUser, srNo: number) {
  const rec = u.studentRecord;
  const parents = rec?.parents || [];

  const fatherKin = parents.find(
    (p) => p.relationship === 'FATHER' || p.relationship === 'father'
  );
  const motherKin = parents.find(
    (p) => p.relationship === 'MOTHER' || p.relationship === 'mother'
  );
  const primaryKin = parents.find((p) => p.isPrimary) || parents[0];

  const fatherName =
    fatherKin?.parentRecord?.user?.name ||
    primaryKin?.parentRecord?.user?.name ||
    '';
  const fatherPhone =
    fatherKin?.parentRecord?.user?.phone ||
    primaryKin?.parentRecord?.user?.phone ||
    '';
  const fatherCnic =
    fatherKin?.parentRecord?.cnic || primaryKin?.parentRecord?.cnic || '';
  const fatherOccupation =
    fatherKin?.parentRecord?.occupation ||
    primaryKin?.parentRecord?.occupation ||
    '';

  const motherName = motherKin?.parentRecord?.user?.name || '';
  const motherPhone = motherKin?.parentRecord?.user?.phone || '';

  const academicYear = rec?.academicYearRecords?.[0]?.academicYear
    ? `${rec.academicYearRecords[0].academicYear.startYear} - ${rec.academicYearRecords[0].academicYear.stopYear}`
    : '';

  return {
    srNo,
    id: u.id,
    studentRecordId: rec?.id || '',
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    gender: u.gender || 'UNSPECIFIED',
    address: u.address || '',
    city: u.city || '',
    religion: u.religion || '',
    suspended: u.suspended,
    status: u.suspended ? 'Suspended' : 'Active',
    admissionNumber: rec?.admissionNumber || '',
    rollNumber: rec?.rollNumber || '',
    admissionDate: rec?.admissionDate ? rec.admissionDate.toISOString() : '',
    classId: rec?.classId || '',
    className: rec?.myClass?.name || 'Unassigned',
    classGroupId: rec?.myClass?.classGroupId || '',
    classGroupName: rec?.myClass?.classGroup?.name || '',
    sectionId: rec?.sectionId || '',
    sectionName: rec?.section?.name || 'General',
    streamName: rec?.subjectGroup?.name || '',
    academicYear,
    fatherName,
    fatherPhone,
    fatherCnic,
    fatherOccupation,
    motherName,
    motherPhone,
    primaryGuardianName: primaryKin?.parentRecord?.user?.name || fatherName,
    primaryGuardianPhone:
      primaryKin?.parentRecord?.user?.phone || fatherPhone || u.phone || '',
  };
}

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('REPORTS', 'VIEW');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId')?.trim() || '';
    const classGroupId = searchParams.get('classGroupId')?.trim() || '';
    const sectionId = searchParams.get('sectionId')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'ALL';
    const gender = searchParams.get('gender')?.trim() || 'ALL';
    const q = searchParams.get('q')?.trim() || '';
    const all = searchParams.get('all') === '1';
    const parsed = parsePagination(searchParams, {
      defaultPageSize: all ? 2000 : 25,
      maxPageSize: all ? 2000 : 100,
      minPageSize: all ? 1 : 10,
    });
    const page = all ? 1 : parsed.page;
    const pageSize = parsed.pageSize;

    const studentRecordFilter: Prisma.StudentRecordWhereInput = {};

    if (classId) {
      studentRecordFilter.classId = classId;
    } else if (classGroupId) {
      studentRecordFilter.myClass = { classGroupId };
    }

    if (sectionId) {
      studentRecordFilter.sectionId = sectionId;
    }

    if (session.user.role === 'TEACHER') {
      const staff = await prisma.staffRecord.findUnique({
        where: { userId: session.user.id! },
        select: { id: true },
      });
      if (staff) {
        const assignments = await prisma.subjectAssignment.findMany({
          where: { teacherId: staff.id },
          select: { classId: true },
        });
        const assignedClassIds = Array.from(new Set(assignments.map((a) => a.classId)));
        if (assignedClassIds.length > 0 && !classId) {
          studentRecordFilter.classId = { in: assignedClassIds };
        }
      }
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
      role: 'STUDENT',
      deletedAt: null,
      ...schoolScope(session),
      studentRecord: hasRecordFilter ? { is: studentRecordFilter } : { isNot: null },
    };

    if (status === 'ACTIVE') {
      where.suspended = false;
    } else if (status === 'SUSPENDED') {
      where.suspended = true;
    }

    if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER' || gender === 'UNSPECIFIED') {
      where.gender = gender satisfies Gender;
    }

    const phoneWhere: Prisma.UserWhereInput = {
      AND: [
        where,
        {
          OR: [
            { AND: [{ phone: { not: null } }, { NOT: { phone: '' } }] },
            {
              studentRecord: {
                is: {
                  parents: {
                    some: {
                      parentRecord: {
                        user: {
                          AND: [{ phone: { not: null } }, { NOT: { phone: '' } }],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const fatherWhere: Prisma.UserWhereInput = {
      AND: [
        where,
        {
          studentRecord: {
            is: {
              parents: {
                some: {
                  parentRecord: { user: { name: { not: '' } } },
                },
              },
            },
          },
        },
      ],
    };

    const [groups, withPhoneCount, withFatherInfoCount, students, schoolInfo] = await Promise.all([
      prisma.user.groupBy({
        by: ['gender', 'suspended'],
        where,
        _count: { _all: true },
      }),
      prisma.user.count({ where: phoneWhere }),
      prisma.user.count({ where: fatherWhere }),
      prisma.user.findMany({
        where,
        select: studentSelect,
        orderBy: [{ studentRecord: { rollNumber: 'asc' } }, { name: 'asc' }],
        skip: all ? 0 : (page - 1) * pageSize,
        take: pageSize,
      }),
      session.user.schoolId
        ? prisma.school.findUnique({
            where: { id: session.user.schoolId },
            select: {
              id: true,
              name: true,
              initials: true,
              address: true,
              email: true,
              phone: true,
              logoPath: true,
            },
          })
        : Promise.resolve(null),
    ]);

    let maleStudents = 0;
    let femaleStudents = 0;
    let activeStudents = 0;
    let suspendedStudents = 0;
    let total = 0;
    for (const row of groups) {
      const count = row._count._all;
      total += count;
      if (row.gender === 'MALE') maleStudents += count;
      else if (row.gender === 'FEMALE') femaleStudents += count;
      if (row.suspended) suspendedStudents += count;
      else activeStudents += count;
    }

    const offset = all ? 0 : (page - 1) * pageSize;
    const formattedStudents = students.map((student, idx) => formatStudent(student, offset + idx + 1));

    const activeSchool = schoolInfo || {
      name: 'School Management',
      initials: 'SMS',
      address: '',
      email: '',
      phone: '',
      logoPath: '/logo/logo.png',
    };

    return NextResponse.json(
      stripSecrets({
        school: activeSchool,
        students: formattedStudents,
        stats: {
          totalStudents: total,
          maleStudents,
          femaleStudents,
          otherStudents: total - maleStudents - femaleStudents,
          activeStudents,
          suspendedStudents,
          withPhoneCount,
          withFatherInfoCount,
        },
        ...pageMeta(page, pageSize, total),
        truncated: all && total > formattedStudents.length,
      })
    );
  } catch (error) {
    console.error('Error fetching student report:', error);
    return NextResponse.json(
      { error: 'Failed to generate student report' },
      { status: 500 }
    );
  }
}
