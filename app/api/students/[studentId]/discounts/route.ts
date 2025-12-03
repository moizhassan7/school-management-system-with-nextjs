import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignSchema = z.object({
  discountId: z.string().min(1, "Discount ID is required"),
});

// GET: Fetch all discounts assigned to this student
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const assignments = await prisma.studentDiscount.findMany({
      where: { studentId },
      include: { 
        discount: {
          include: { feeHead: true }
        } 
      }
    });
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
  }
}

// POST: Assign a discount to the student
export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const body = await request.json();
    const { discountId } = assignSchema.parse(body);

    // Prevent duplicate assignment
    const existing = await prisma.studentDiscount.findFirst({
      where: { studentId, discountId }
    });

    if (existing) {
      return NextResponse.json({ error: "Discount already assigned" }, { status: 400 });
    }

    const assignment = await prisma.studentDiscount.create({
      data: {
        studentId,
        discountId
      },
      include: { discount: true }
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}

// DELETE: Remove a discount
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.studentDiscount.delete({
      where: { id: assignmentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Removal failed" }, { status: 500 });
  }
}