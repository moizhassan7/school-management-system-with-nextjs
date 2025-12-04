import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { auth } from '@/auth'

const studentSchema = z.object({
  admissionNumber: z.string().optional(),
  rollNumber: z.string().optional(), // NEW
  admissionDate: z.string(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  subjectGroupId: z.string().optional(), // NEW
  academicYearId: z.string().optional(),
  academicYear: z.object({
    startYear: z.string(),
    stopYear: z.string(),
  }).optional(),
});

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().optional().or(z.literal('')),
  religion: z.string().optional().or(z.literal('')),
  emailVerified: z.boolean().optional(),
  profilePath: z.string().optional().or(z.literal('')),
  schoolId: z.string().min(1),
  gender: z.enum(['MALE','FEMALE','OTHER','UNSPECIFIED']).optional(),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  suspended: z.boolean().optional(),
  locked: z.boolean().optional(),
  student: studentSchema.optional(),
})

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const where = role === 'SUPER_ADMIN' ? { deletedAt: null } : { deletedAt: null, schoolId };
    const users = await prisma.user.findMany({
      where,
      include: { school: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json()
    const data = userSchema.parse(body)

    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex')

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        city: data.city || null,
        religion: data.religion || null,
        emailVerified: data.emailVerified ?? false,
        emailVerifiedAt: (data.emailVerified ?? false) ? new Date() : null,
        profilePath: data.profilePath || null,
        schoolId: role === 'SUPER_ADMIN' ? data.schoolId : schoolId,
        gender: data.gender ?? 'UNSPECIFIED',
        phone: data.phone || null,
        address: data.address || null,
        suspended: data.suspended ?? false,
        locked: data.locked ?? false,
      },
    })

    if (data.student) {
      const s = data.student
      let academicYearId = s.academicYearId
      if (!academicYearId && s.academicYear) {
        const existing = await prisma.academicYear.findFirst({
          where: {
            schoolId: data.schoolId,
            startYear: s.academicYear.startYear,
            stopYear: s.academicYear.stopYear,
          },
        })
        if (existing) {
          academicYearId = existing.id
        } else {
          const createdYear = await prisma.academicYear.create({
            data: {
              schoolId: data.schoolId,
              startYear: s.academicYear.startYear,
              stopYear: s.academicYear.stopYear,
            },
          })
          academicYearId = createdYear.id
        }
      }

      const record = await prisma.studentRecord.create({
        data: {
          userId: user.id,
          admissionNumber: s.admissionNumber || null,
          rollNumber: s.rollNumber || null,
          subjectGroupId: s.subjectGroupId || null,
          admissionDate: new Date(s.admissionDate),
          classId: s.classId || null,
          sectionId: s.sectionId || null,
        },
      })

      if (academicYearId) {
        await prisma.academicYearStudentRecord.create({
          data: {
            academicYearId,
            studentRecordId: record.id,
            classId: s.classId || null,
            sectionId: s.sectionId || null,
          },
        })
      }
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
