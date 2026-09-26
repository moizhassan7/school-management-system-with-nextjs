import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { forbidOrMissing, schoolIdForSubject, schoolIdForSubjectGroup } from '@/lib/tenant';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  subjectGroupId: z.string().nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'EDIT');
    if (error || !session) return error;
    const { subjectId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForSubject(subjectId));
    if (denied) return denied;

    const data = updateSchema.parse(await request.json());
    if (data.subjectGroupId) {
      const groupSchoolId = await schoolIdForSubjectGroup(data.subjectGroupId);
      const subjectSchoolId = await schoolIdForSubject(subjectId);
      if (!groupSchoolId || groupSchoolId !== subjectSchoolId) {
        return NextResponse.json({ error: 'Subject group is in another school' }, { status: 400 });
      }
    }

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.code !== undefined ? { code: data.code?.trim() || null } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.subjectGroupId !== undefined ? { subjectGroupId: data.subjectGroupId } : {}),
      },
      include: { subjectGroup: { select: { id: true, name: true } } },
    });
    return NextResponse.json(subject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'DELETE');
    if (error || !session) return error;
    const { subjectId } = await params;
    const denied = forbidOrMissing(session, await schoolIdForSubject(subjectId));
    if (denied) return denied;
    await prisma.subject.delete({
      where: { id: subjectId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}