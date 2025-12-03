import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    await prisma.section.delete({
      where: { id: sectionId },
    });
    return NextResponse.json({ message: 'Section deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}