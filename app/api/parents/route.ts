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
  
  // Initial Student Link (Optional - usually we link siblings later)
  studentId: z.string().optional(), 
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = parentSchema.parse(body);

    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

    // 1. Create the User and ParentRecord
    const parentUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone,
        address: data.address,
        schoolId: data.schoolId,
        // Create Parent Record inline
        parentRecord: {
          create: {
            occupation: data.occupation,
            cnic: data.cnic,
          }
        }
      },
      include: {
        parentRecord: true
      }
    });

    // 2. If a student ID was provided, create the Kinship link immediately
    if (data.studentId && parentUser.parentRecord) {
      await prisma.kinship.create({
        data: {
          parentId: parentUser.parentRecord.id,
          studentId: data.studentId,
          relationship: data.relationship || 'GUARDIAN',
          isPrimary: true
        }
      });
    }

    return NextResponse.json(parentUser, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 });
  }
}