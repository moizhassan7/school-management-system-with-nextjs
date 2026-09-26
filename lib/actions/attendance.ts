'use server';

import { AttendanceStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';

function utcDayRange(input: Date) {
  const start = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}
export async function getTeacherSections(teacherUserId: string) {
  // 1. Find the StaffRecord for this User
  const staff = await prisma.staffRecord.findUnique({
    where: { userId: teacherUserId },
    include: {
      sectionsIncharged: {
        include: {
          myClass: true,
        },
      },
    },
  });

  if (!staff) {
    return [];
  }

  return staff.sectionsIncharged;
}

/** Super Admin sees every section. Admin sees every section in their school. */
export async function getSchoolSections(role: string, schoolId?: string | null) {
  const schoolFilter =
    role === 'SUPER_ADMIN'
      ? {}
      : {
          myClass: {
            classGroup: {
              campus: { schoolId: schoolId || '__none__' },
            },
          },
        };

  return prisma.section.findMany({
    where: {
      isActive: true,
      ...schoolFilter,
    },
    include: {
      myClass: {
        include: {
          classGroup: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { myClass: { classGroup: { name: 'asc' } } },
      { myClass: { name: 'asc' } },
      { name: 'asc' },
    ],
  });
}

export async function getSectionStudents(sectionId: string) {
  const students = await prisma.studentRecord.findMany({
    where: {
      sectionId: sectionId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          profilePath: true,
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  });

  return students;
}

export async function getAttendanceByDate(sectionId: string, date: Date) {
  // Normalize date to start of day (or ensure we compare just the date part if stored as DateTime)
  // Prisma stores DateTime as UTC usually. 
  // For simplicity, let's assume we want records where the date falls on this day.
  // But our schema has `date DateTime`.
  
  const { start: startOfDay, end: endOfDay } = utcDayRange(date);

  const attendance = await prisma.attendance.findMany({
    where: {
      sectionId: sectionId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return attendance;
}

export async function hasAttendanceForDate(sectionId: string, date: Date): Promise<boolean> {
  const attendance = await getAttendanceByDate(sectionId, date);
  return attendance.length > 0;
}

export async function saveAttendance(
  sectionId: string,
  inputDate: Date,
  records: { studentId: string; status: AttendanceStatus; remarks?: string }[],
  recordedByUserId: string
) {
  // Normalize date to ensure consistency (strip time)
  const date = utcDayRange(inputDate).start;

  // 1. Get necessary context (School, Class, AcademicYear)
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      myClass: {
        include: {
          classGroup: {
            include: {
              campus: {
                include: {
                  school: true
                }
              }
            }
          }
        }
      },
    },
  });

  if (!section) throw new Error('Section not found');

  const schoolId = section.myClass.classGroup.campus.schoolId;
  const classId = section.classId;

  // 2. Upsert records
  // We use a transaction to ensure all or nothing
  await prisma.$transaction(
    records.map((record) =>
      prisma.attendance.upsert({
        where: {
          studentId_date_sectionId: {
            studentId: record.studentId,
            date: date,
            sectionId: sectionId,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          recordedById: recordedByUserId,
        },
        create: {
          date: date,
          status: record.status,
          remarks: record.remarks,
          studentId: record.studentId,
          sectionId: sectionId,
          classId: classId,
          schoolId: schoolId,
          recordedById: recordedByUserId,
        },
      })
    )
  );

  revalidatePath('/attendance');
}
