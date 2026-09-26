import { prisma } from '@/lib/prisma';
import { assertSameSchool, type AppSession } from '@/lib/authz';
import { NextResponse } from 'next/server';

export async function schoolIdForCampus(campusId: string) {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { schoolId: true },
  });
  return campus?.schoolId ?? null;
}

export async function schoolIdForClassGroup(classGroupId: string) {
  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    select: { campus: { select: { schoolId: true } } },
  });
  return group?.campus.schoolId ?? null;
}

export async function schoolIdForClass(classId: string) {
  const row = await prisma.class.findUnique({
    where: { id: classId },
    select: { classGroup: { select: { campus: { select: { schoolId: true } } } } },
  });
  return row?.classGroup.campus.schoolId ?? null;
}

export async function schoolIdForSubjectGroup(subjectGroupId: string) {
  const row = await prisma.subjectGroup.findUnique({
    where: { id: subjectGroupId },
    select: { classGroup: { select: { campus: { select: { schoolId: true } } } } },
  });
  return row?.classGroup.campus.schoolId ?? null;
}

export async function schoolIdForSubject(subjectId: string) {
  const row = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      schoolId: true,
      subjectGroup: { select: { classGroup: { select: { campus: { select: { schoolId: true } } } } } },
    },
  });
  return row?.schoolId ?? row?.subjectGroup?.classGroup.campus.schoolId ?? null;
}

export async function schoolIdForSection(sectionId: string) {
  const row = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { myClass: { select: { classGroup: { select: { campus: { select: { schoolId: true } } } } } } },
  });
  return row?.myClass.classGroup.campus.schoolId ?? null;
}

export function forbidOrMissing(session: AppSession, schoolId: string | null) {
  if (!schoolId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return assertSameSchool(session, schoolId);
}
