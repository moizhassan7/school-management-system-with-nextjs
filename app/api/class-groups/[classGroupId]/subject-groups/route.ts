import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classGroupId: string }> }
) {
  try {
    const { classGroupId } = await params
    const groups = await prisma.subjectGroup.findMany({
      where: { classGroupId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch subject groups' },
      { status: 500 }
    )
  }
}
