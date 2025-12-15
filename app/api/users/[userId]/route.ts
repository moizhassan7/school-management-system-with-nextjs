import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { auth } from '@/auth'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  city: z.string().optional().or(z.literal('')),
  religion: z.string().optional().or(z.literal('')),
  emailVerified: z.boolean().optional(),
  profilePath: z.string().optional().or(z.literal('')),
  schoolId: z.string().min(1).optional(),
  gender: z.enum(['MALE','FEMALE','OTHER','UNSPECIFIED']).optional(),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  suspended: z.boolean().optional(),
  locked: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { userId } = await params
    
    // FETCH USER WITH PARENTS (KINSHIP) INCLUDED
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        studentRecord: {
          include: {
            academicYearRecords: {
              include: { academicYear: true, myClass: true, section: true },
            },
            myClass: true,
            section: true,
            // FIX: Ensure parents are fetched with user details
            parents: {
              include: {
                parentRecord: {
                    include: {
                        user: {
                            select: { id: true, name: true, phone: true, email: true }
                        }
                    }
                }
              }
            }
          },
        },
      },
    })

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (role !== 'SUPER_ADMIN' && user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(user)
  } catch (error) {
    console.error("GET User Error:", error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { userId } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (role !== 'SUPER_ADMIN' && existing.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const passwordHash = data.password
      ? crypto.createHash('sha256').update(data.password).digest('hex')
      : undefined

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        city: data.city === '' ? null : data.city,
        religion: data.religion === '' ? null : data.religion,
        emailVerified: data.emailVerified ?? existing.emailVerified,
        emailVerifiedAt:
          data.emailVerified === undefined
            ? existing.emailVerifiedAt
            : data.emailVerified
            ? new Date()
            : null,
        profilePath: data.profilePath === '' ? null : data.profilePath,
        schoolId: data.schoolId,
        gender: data.gender,
        phone: data.phone === '' ? null : data.phone,
        address: data.address === '' ? null : data.address,
        suspended: data.suspended ?? existing.suspended,
        locked: data.locked ?? existing.locked,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { userId } = await params
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (role !== 'SUPER_ADMIN' && existing.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}