import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { forbidOrMissing, schoolIdForClass } from '@/lib/tenant';

const sectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
    if (error || !session) return error;
    const { classId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForClass(classId));
    if (denied) return denied;
    const sections = await prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'CREATE');
    if (error || !session) return error;
    const { classId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForClass(classId));
    if (denied) return denied;
    const body = await request.json();
    const validated = sectionSchema.parse(body);

    const section = await prisma.section.create({
      data: {
        name: validated.name,
        classId,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}