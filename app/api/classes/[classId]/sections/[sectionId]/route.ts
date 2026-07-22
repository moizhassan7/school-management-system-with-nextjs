import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission } from '@/lib/authz';

const sectionSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ classId: string; sectionId: string }> }
) {
  try {
    const { error } = await requirePermission('CONFIGURATION', 'EDIT');
    if (error) return error;

    const { sectionId } = await params;
    const body = await request.json();
    const data = sectionSchema.parse(body);

    const section = await prisma.section.update({
      where: { id: sectionId },
      data,
    });
    return NextResponse.json(section);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string; sectionId: string }> }
) {
  try {
    const { error } = await requirePermission('CONFIGURATION', 'DELETE');
    if (error) return error;

    const { sectionId } = await params;
    // Soft deactivate preferred
    const section = await prisma.section.update({
      where: { id: sectionId },
      data: { isActive: false },
    });
    return NextResponse.json(section);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deactivate section' }, { status: 500 });
  }
}
