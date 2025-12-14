import { PrismaClient, Role } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to hash password (matching your app's logic)
const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create a Dummy School
  const school = await prisma.school.upsert({
    where: { id: 'default-school' },
    update: {},
    create: {
      id: 'default-school',
      name: 'Harvard High School',
      initials: 'HHS',
      address: '100 Harvard St, Cambridge, MA 02138',
      email: 'info@harvard.edu',
      phone: '555-0123',
    },
  });

  console.log(`🏫 School created: ${school.name}`);

  const commonPassword = 'password123';
  const hashedPassword = hashPassword(commonPassword);

  // 2. Define Users to Create
  const users = [
    {
      email: 'super@school.com',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
    {
      email: 'admin@school.com',
      name: 'Principal Harvard',
      role: Role.ADMIN,
    },
    {
      email: 'accountant@school.com',
      name: 'Accountant',
      role: Role.ACCOUNTANT,
    },
    {
      email: 'teacher@school.com',
      name: 'Teacher',
      role: Role.TEACHER,
    },
    {
      email: 'student@school.com',
      name: 'Student',
      role: Role.STUDENT,
    },
    {
      email: 'parent@school.com',
      name: 'Parent',
      role: Role.PARENT,
    },
  ];

  // 3. Create Users Loop
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role }, // Ensure role is correct if user exists
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hashedPassword,
        role: u.role,
        schoolId: school.id,
        emailVerified: true,
      },
    });

    // 4. Create Linked Records (Specific logic for Student/Parent)
    
    // If Student, create StudentRecord
    if (u.role === Role.STUDENT) {
      await prisma.studentRecord.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          admissionNumber: 'ADM-2024-001',
          admissionDate: new Date(),
        },
      });
    }

    // If Parent, create ParentRecord
    if (u.role === Role.PARENT) {
      await prisma.parentRecord.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          cnic: '00000-0000000-0',
          occupation: 'Safety Inspector',
        },
      });
    }

    console.log(`👤 Created ${u.role}: ${u.email}`);
  }

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
