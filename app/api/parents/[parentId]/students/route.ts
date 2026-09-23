import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission, assertSameSchool, stripSecrets } from '@/lib/authz';

const linkSchema = z.object({
  studentId: z.string().min(1),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
});

// POST: Add a student to a parent (Create Kinship)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const { session, error } = await requirePermission('STUDENTS', 'EDIT');
    if (error || !session) return error;

    const { parentId } = await params;
    const parent = await prisma.parentRecord.findUnique({
      where: { id: parentId },
      include: { user: { select: { schoolId: true } } },
    });
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    const denied = assertSameSchool(session, parent.user.schoolId);
    if (denied) return denied;
    const body = await request.json();
    const { studentId, relationship } = linkSchema.parse(body);

    const kinship = await prisma.kinship.create({
      data: {
        parentId,
        studentId,
        relationship,
      },
    });

    return NextResponse.json(kinship);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to link student' }, { status: 500 });
  }
}

// GET: Get all children of a parent
export async function GET(
  request: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const { session, error } = await requirePermission('STUDENTS', 'VIEW');
  if (error || !session) return error;

  const { parentId } = await params;
  const parent = await prisma.parentRecord.findUnique({
    where: { id: parentId },
    include: { user: { select: { schoolId: true } } },
  });
  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  const denied = assertSameSchool(session, parent.user.schoolId);
  if (denied) return denied;

  const kinships = await prisma.kinship.findMany({
    where: { parentId },
    include: {
      studentRecord: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, gender: true } },
          myClass: true // Get student class
        }
      }
    }
  });
  
  return NextResponse.json(stripSecrets(kinships));
}