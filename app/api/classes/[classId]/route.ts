import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission } from '@/lib/authz';

const classSchema = z.object({
  name: z.string().min(1).optional(),
  classGroupId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
    if (error) return error;

    const { classId } = await params;
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        sections: { orderBy: { name: 'asc' } },
        classGroup: {
          include: {
            campus: { include: { school: true } },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (
      session!.user.role !== 'SUPER_ADMIN' &&
      classData.classGroup?.campus?.schoolId !== session!.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(classData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { error } = await requirePermission('CONFIGURATION', 'EDIT');
    if (error) return error;

    const { classId } = await params;
    const body = await request.json();
    const data = classSchema.parse(body);

    const updated = await prisma.class.update({
      where: { id: classId },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { error } = await requirePermission('CONFIGURATION', 'DELETE');
    if (error) return error;

    const { classId } = await params;
    const updated = await prisma.class.update({
      where: { id: classId },
      data: { isActive: false },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deactivate class' }, { status: 500 });
  }
}
