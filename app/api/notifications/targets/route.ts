import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { assertSameSchool, requirePermission } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('NOTIFICATIONS', 'CREATE');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId')?.trim();
    if (!schoolId) {
      return NextResponse.json({ error: 'School is required' }, { status: 400 });
    }

    const denied = assertSameSchool(session, schoolId);
    if (denied) return denied;

    const students = await prisma.user.findMany({
      where: {
        schoolId,
        role: 'STUDENT',
        deletedAt: null,
        suspended: false,
        locked: false,
        studentRecord: { isNot: null },
      },
      orderBy: { name: 'asc' },
      take: 2000,
      select: {
        id: true,
        name: true,
        schoolId: true,
        studentRecord: {
          select: {
            admissionNumber: true,
            classId: true,
            myClass: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: students, truncated: students.length === 2000 });
  } catch (error) {
    return handleApiError(error, 'Failed to load notification recipients');
  }
}
