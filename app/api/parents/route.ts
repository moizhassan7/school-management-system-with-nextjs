import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

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
  const body = await request.json();
  const data = parentSchema.parse(body);
  const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          phone: data.phone,
          address: data.address,
          schoolId: data.schoolId,
          role: 'PARENT',
        },
      });

      const parentRecord = await tx.parentRecord.create({
        data: {
          userId: user.id,
          occupation: data.occupation,
          cnic: data.cnic,
        }
      });

      if (data.studentId) {
        await tx.kinship.create({
          data: {
            parentId: parentRecord.id,
            studentId: data.studentId,
            relationship: data.relationship || 'GUARDIAN',
            isPrimary: true
          }
        });
      }

      return {
        ...user,
        parentRecord
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    // If parent user email already exists, link that existing parent instead of failing admission flow.
    const isDuplicateEmail = error?.code === 'P2002';
    if (isDuplicateEmail) {
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

        return NextResponse.json(
          {
            ...existing,
            parentRecord: ensuredParentRecord,
            kinship,
            reusedExistingParent: true,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ error: 'Parent email already exists' }, { status: 409 });
    }

    console.error('Create Parent Error:', error);
    return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 });
  }
}