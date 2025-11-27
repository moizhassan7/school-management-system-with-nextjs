import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const subjectGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal('')),
  classGroupId: z.string().min(1),
})

export async function GET() {
  try {
    const subjectGroups = await prisma.subjectGroup.findMany({
      include: {
        classGroup: {
          include: {
            campus: {
              include: { school: true },
            },
          },
        },
        subjects: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(subjectGroups)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subject groups' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = subjectGroupSchema.parse(body)

    const exists = await prisma.classGroup.findUnique({ where: { id: data.classGroupId } })
    if (!exists) {
      return NextResponse.json({ error: 'Class group not found' }, { status: 404 })
    }

    const subjectGroup = await prisma.subjectGroup.create({
      data: {
        name: data.name,
        description: data.description || null,
        classGroupId: data.classGroupId,
      },
    })

    return NextResponse.json(subjectGroup, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Invalid class group reference' }, { status: 400 })
      }
    }
    console.error('Error creating subject group:', error)
    return NextResponse.json({ error: 'Failed to create subject group' }, { status: 500 })
  }
}
