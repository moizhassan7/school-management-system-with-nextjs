import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/authz'
import { forbidOrMissing, schoolIdForClassGroup } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classGroupId: string }> }
) {
  try {
    const { session, error } = await requirePermission('CONFIGURATION', 'VIEW')
    if (error || !session) return error
    const { classGroupId } = await params
    const denied = forbidOrMissing(session, await schoolIdForClassGroup(classGroupId))
    if (denied) return denied
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
