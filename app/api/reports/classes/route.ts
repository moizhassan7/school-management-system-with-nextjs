import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET() {
  try {
    const { session, error } = await requirePermission('REPORTS', 'VIEW');
    if (error || !session) return error;

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const schoolId = session.user.schoolId;

    if (!isSuperAdmin && !schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const classGroups = await prisma.classGroup.findMany({
      where: isSuperAdmin
        ? {}
        : {
            campus: {
              schoolId: schoolId,
            },
          },
      select: {
        id: true,
        name: true,
        classes: {
          select: {
            id: true,
            name: true,
            sections: {
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(classGroups, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (err) {
    console.error('Error fetching report class filters:', err);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}
