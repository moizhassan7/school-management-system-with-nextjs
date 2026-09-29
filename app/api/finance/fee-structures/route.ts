import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  if (!classId) return NextResponse.json([]);
  const where = role === 'SUPER_ADMIN' ? { classId } : { classId, schoolId };
  const structures = await prisma.feeStructure.findMany({
    where,
    include: { feeHead: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(structures);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Bulk / Sync mode: { classId, structures: [{ feeHeadId, amount }], schoolId? }
  if (Array.isArray(body.structures)) {
    const classId = body.classId;
    if (!classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 });
    }

    let targetSchoolId = schoolId || body.schoolId;
    if (!targetSchoolId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: { classGroup: { include: { campus: true } } },
      });
      targetSchoolId = cls?.classGroup?.campus?.schoolId;
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: 'School ID could not be determined' }, { status: 400 });
    }

    const activeHeadIds = body.structures
      .map((s: any) => s.feeHeadId)
      .filter(Boolean);

    // 1. Delete all fee structures for this class that are NOT in activeHeadIds
    const deleteWhere: any = {
      classId,
      ...(activeHeadIds.length > 0 ? { feeHeadId: { notIn: activeHeadIds } } : {}),
    };
    if (role !== 'SUPER_ADMIN' && schoolId) {
      deleteWhere.schoolId = schoolId;
    }

    await prisma.feeStructure.deleteMany({
      where: deleteWhere,
    });

    // 2. Upsert each active structure
    const saved = [];
    for (const item of body.structures) {
      if (!item.feeHeadId) continue;
      const entry = await prisma.feeStructure.upsert({
        where: {
          feeHeadId_classId: {
            feeHeadId: item.feeHeadId,
            classId,
          },
        },
        update: { amount: item.amount },
        create: {
          classId,
          feeHeadId: item.feeHeadId,
          amount: item.amount,
          schoolId: targetSchoolId,
        },
      });
      saved.push(entry);
    }

    return NextResponse.json(saved);
  }

  // Single item mode (backward compatibility)
  let targetSchoolId = schoolId || body.schoolId;
  if (!targetSchoolId && body.classId) {
    const cls = await prisma.class.findUnique({
      where: { id: body.classId },
      include: { classGroup: { include: { campus: true } } },
    });
    targetSchoolId = cls?.classGroup?.campus?.schoolId;
  }

  if (!targetSchoolId) {
    return NextResponse.json({ error: 'School ID could not be determined' }, { status: 400 });
  }

  const structure = await prisma.feeStructure.upsert({
    where: { feeHeadId_classId: { feeHeadId: body.feeHeadId, classId: body.classId } },
    update: { amount: body.amount },
    create: {
      classId: body.classId,
      feeHeadId: body.feeHeadId,
      amount: body.amount,
      schoolId: targetSchoolId,
    },
  });
  return NextResponse.json(structure);
}

export async function DELETE(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let classId = searchParams.get('classId');
  let feeHeadId = searchParams.get('feeHeadId');

  if (!classId || !feeHeadId) {
    try {
      const body = await req.json();
      classId = classId || body?.classId;
      feeHeadId = feeHeadId || body?.feeHeadId;
    } catch {
      // Body may be empty
    }
  }

  if (!classId || !feeHeadId) {
    return NextResponse.json(
      { error: 'classId and feeHeadId are required' },
      { status: 400 }
    );
  }

  const where: any = {
    classId,
    feeHeadId,
  };
  if (role !== 'SUPER_ADMIN' && schoolId) {
    where.schoolId = schoolId;
  }

  const deleteResult = await prisma.feeStructure.deleteMany({
    where,
  });

  return NextResponse.json({ success: true, count: deleteResult.count });
}
