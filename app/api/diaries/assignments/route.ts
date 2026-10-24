import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { requirePermission } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { session, error } = await requirePermission('DIARIES', 'CREATE');
    if (error || !session) return error;
    if (session.user.role !== 'TEACHER' || !session.user.id) {
      return NextResponse.json({ data: [] });
    }

    const staff = await prisma.staffRecord.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!staff) return NextResponse.json({ data: [] });

    const assignments = await prisma.subjectAssignment.findMany({
      where: {
        teacherId: staff.id,
        myClass: { isActive: true },
      },
      orderBy: [{ myClass: { name: 'asc' } }, { subject: { name: 'asc' } }],
      select: {
        classId: true,
        subjectId: true,
        myClass: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });

    const unique = new Map<string, (typeof assignments)[number]>();
    for (const assignment of assignments) {
      const key = `${assignment.classId}:${assignment.subjectId}`;
      if (!unique.has(key)) unique.set(key, assignment);
    }
    return NextResponse.json({ data: [...unique.values()] });
  } catch (error) {
    return handleApiError(error, 'Failed to load diary assignments');
  }
}
