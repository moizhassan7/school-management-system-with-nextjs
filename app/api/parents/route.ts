import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission, assertSameSchool, stripSecrets, type AppSession } from '@/lib/authz';
import { hashPassword } from '@/lib/password';
import { handleApiError } from '@/lib/api-error';

const parentSchema = z.object({
  // User Data
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: z.string().optional(),
  schoolId: z.string().min(1),
  
  // Parent Specific
  occupation: z.string().optional(),
  cnic: z.string().optional(),
  
  // Initial Student Link
  studentId: z.string().optional(), 
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
});

export async function POST(request: Request) {
  let data: z.infer<typeof parentSchema> | null = null;
  let session: AppSession | null = null;
  try {
    const authResult = await requirePermission('STUDENTS', 'CREATE');
    if (authResult.error || !authResult.session) return authResult.error;
    session = authResult.session;

    const body = await request.json();
    const parsed = parentSchema.parse(body);
    data = parsed;
    const schoolId =
      session.user.role === 'SUPER_ADMIN' ? parsed.schoolId : session.user.schoolId || '';
    if (!schoolId) {
      return NextResponse.json({ error: 'School is required' }, { status: 400 });
    }
    const denied = assertSameSchool(session, schoolId);
    if (denied) return denied;

    if (parsed.studentId) {
      const student = await prisma.studentRecord.findUnique({
        where: { id: parsed.studentId },
        include: { user: { select: { schoolId: true } } },
      });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      const studentDenied = assertSameSchool(session, student.user.schoolId);
      if (studentDenied) return studentDenied;
    }

    const passwordHash = await hashPassword(parsed.password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          passwordHash,
          phone: parsed.phone,
          address: parsed.address,
          schoolId,
          role: 'PARENT',
        },
      });

      const parentRecord = await tx.parentRecord.create({
        data: {
          userId: user.id,
          occupation: parsed.occupation,
          cnic: parsed.cnic,
        }
      });

      if (parsed.studentId) {
        await tx.kinship.create({
          data: {
            parentId: parentRecord.id,
            studentId: parsed.studentId,
            relationship: parsed.relationship || 'GUARDIAN',
            isPrimary: true
          }
        });
      }

      return {
        ...user,
        parentRecord
      };
    });

    return NextResponse.json(stripSecrets(result), { status: 201 });
  } catch (error: any) {
    // If parent user email already exists, link that existing parent instead of failing admission flow.
    const isDuplicateEmail = error?.code === 'P2002';
    if (isDuplicateEmail && data) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
        include: { parentRecord: true },
      });

      if (existing && data.studentId) {
        const ensuredParentRecord = existing.parentRecord
          ? existing.parentRecord
          : await prisma.parentRecord.create({
              data: {
                userId: existing.id,
                occupation: data.occupation,
                cnic: data.cnic,
              },
            });

        const kinship = await prisma.kinship.upsert({
          where: {
            studentId_parentId: {
              studentId: data.studentId,
              parentId: ensuredParentRecord.id,
            },
          },
          update: {
            relationship: data.relationship || 'GUARDIAN',
          },
          create: {
            parentId: ensuredParentRecord.id,
            studentId: data.studentId,
            relationship: data.relationship || 'GUARDIAN',
            isPrimary: true,
          },
        });

        const existingDenied = assertSameSchool(session, existing.schoolId);
        if (existingDenied) return existingDenied;

        return NextResponse.json(
          stripSecrets({
            ...existing,
            parentRecord: ensuredParentRecord,
            kinship,
            reusedExistingParent: true,
          }),
          { status: 200 }
        );
      }

      return NextResponse.json({ error: 'Parent email already exists' }, { status: 409 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parent', issues: error.issues }, { status: 400 });
    }
    return handleApiError(error, 'Failed to create parent');
  }
}