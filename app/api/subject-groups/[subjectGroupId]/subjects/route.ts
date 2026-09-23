import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { forbidOrMissing, schoolIdForSubjectGroup } from '@/lib/tenant';

const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(), // e.g. PHY-101
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectGroupId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
    if (error || !session) return error;
    const { subjectGroupId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForSubjectGroup(subjectGroupId));
    if (denied) return denied;
    const subjects = await prisma.subject.findMany({
      where: { subjectGroupId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectGroupId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'CREATE');
    if (error || !session) return error;
    const { subjectGroupId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForSubjectGroup(subjectGroupId));
    if (denied) return denied;
    const body = await request.json();
    const validated = subjectSchema.parse(body);

    const subject = await prisma.subject.create({
      data: {
        name: validated.name,
        // code: validated.code, // Uncomment if you added 'code' to schema
        subjectGroupId,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}