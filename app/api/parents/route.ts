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
  try {
    const body = await request.json();
    const data = parentSchema.parse(body);

    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

    // Use a transaction to ensure User and ParentRecord are created together
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create the base User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          phone: data.phone,
          address: data.address,
          schoolId: data.schoolId,
          role: 'PARENT', // Important: Explicitly set role
        },
      });

      // 2. Explicitly create the ParentRecord
      // We pass 'undefined' for optional fields if they are missing, which Prisma handles as NULL
      const parentRecord = await tx.parentRecord.create({
        data: {
          userId: user.id,
          occupation: data.occupation,
          cnic: data.cnic,
        }
      });

      // 3. If a student ID was provided, create the Kinship link
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

      // Return combined data
      return {
        ...user,
        parentRecord
      };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Create Parent Error:', error);
    return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 });
  }
}