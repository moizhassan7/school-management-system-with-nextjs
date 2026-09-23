import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission, assertSameSchool } from '@/lib/authz';

const schoolSchema = z.object({
  name: z.string().min(1).optional(),
  initials: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  logoPath: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
    if (error || !session) return error;

    const { schoolId } = await params;
    const denied = assertSameSchool(session, schoolId);
    if (denied) return denied;
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    return NextResponse.json(school, { status: 200 });
  } catch (error) {
    console.error('Error fetching school:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'EDIT');
    if (error || !session) return error;

    const { schoolId } = await params;
    const denied = assertSameSchool(session, schoolId);
    if (denied) return denied;
    const body = await request.json();
    const data = schoolSchema.parse(body);

    const school = await prisma.school.update({
      where: { id: schoolId },
      data,
    });
    return NextResponse.json(school);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'DELETE');
    if (error || !session) return error;

    const { schoolId } = await params;
    const denied = assertSameSchool(session, schoolId);
    if (denied) return denied;
    // Soft-deactivate instead of hard delete
    const school = await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false },
    });
    return NextResponse.json(school);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deactivate school' }, { status: 500 });
  }
}
