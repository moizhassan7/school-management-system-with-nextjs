import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { schoolIdForSubjectGroup } from '@/lib/tenant';

// GET /api/subjects - Get all subjects
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user.schoolId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(session.user.role || '');
    let subjectWhere: any =
      role === 'SUPER_ADMIN' && !session.user.schoolId
        ? {}
        : { schoolId: session.user.schoolId };

    if (role === 'TEACHER') {
      const staff = await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } });
      if (!staff) {
        return NextResponse.json([], { status: 200 });
      }
      const assignments = await prisma.subjectAssignment.findMany({
        where: { teacherId: staff.id },
        select: { subjectId: true }
      });
      const subjectIds = Array.from(new Set(assignments.map(a => a.subjectId)));
      subjectWhere = {
        ...subjectWhere,
        id: { in: subjectIds.length ? subjectIds : ['__none__'] }
      };
    }

    const subjects = await prisma.subject.findMany({
      where: subjectWhere,
      include: {
        subjectGroup: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Create a new subject
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.user, 'CONFIGURATION', 'CREATE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, subjectGroupId, description } = body;
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let schoolId = session.user.schoolId || null;
    if (subjectGroupId) {
      const groupSchoolId = await schoolIdForSubjectGroup(subjectGroupId);
      if (!groupSchoolId || (session.user.role !== 'SUPER_ADMIN' && groupSchoolId !== session.user.schoolId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      schoolId = groupSchoolId;
    }
    if (!schoolId) {
      return NextResponse.json({ error: 'School is required' }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        name: String(name).trim(),
        code: code ? String(code).trim() : null,
        subjectGroupId: subjectGroupId || null,
        description: description || null,
        schoolId,
      },
      include: { subjectGroup: { select: { id: true, name: true } } },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}
