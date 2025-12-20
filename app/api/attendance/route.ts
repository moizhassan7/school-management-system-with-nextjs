import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const sectionId = body?.sectionId;
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 });
    }

    const staff = await prisma.staffRecord.findUnique({ where: { userId: session.user.id! } });
    if (!staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { classTeacherId: true }
    });
    if (!section || section.classTeacherId !== staff.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
