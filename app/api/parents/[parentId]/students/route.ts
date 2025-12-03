import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
    const { parentId } = await params;
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
  const { parentId } = await params;
  const kinships = await prisma.kinship.findMany({
    where: { parentId },
    include: {
      studentRecord: {
        include: {
          user: true, // Get student name/details
          myClass: true // Get student class
        }
      }
    }
  });
  
  return NextResponse.json(kinships);
}