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

  // Create Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 'default-academic-year' },
    update: {},
    create: {
      id: 'default-academic-year',
      startYear: '2024',
      stopYear: '2025',
      schoolId: school.id
    }
  });

  console.log(`📅 Academic Year created: ${academicYear.startYear}-${academicYear.stopYear}`);

  // Create Campus
  const campus = await prisma.campus.upsert({
    where: { id: 'default-campus' },
    update: {},
    create: {
      id: 'default-campus',
      name: 'Main Campus',
      address: '100 Harvard St, Cambridge, MA 02138',
      phone: '555-0123',
      email: 'campus@harvard.edu',
      schoolId: school.id
    }
  });

  console.log(`🏫 Campus created: ${campus.name}`);

  // Create Class Group
  const classGroup = await prisma.classGroup.upsert({
    where: { id: 'default-class-group' },
    update: {},
    create: {
      id: 'default-class-group',
      name: 'Primary School',
      description: 'Grades 1-5',
      campusId: campus.id
    }
  });

  console.log(`📚 Class Group created: ${classGroup.name}`);

  // Create Classes
  const classes = [
    { name: 'Grade 1' },
    { name: 'Grade 2' },
    { name: 'Grade 3' }
  ];

  for (const cls of classes) {
    await prisma.class.upsert({
      where: { id: `class-${cls.name.toLowerCase().replace(' ', '-')}` },
      update: {},
      create: {
        id: `class-${cls.name.toLowerCase().replace(' ', '-')}`,
        name: cls.name,
        classGroupId: classGroup.id
      }
    });
  }

  console.log(`📖 Classes created: ${classes.map(c => c.name).join(', ')}`);

  // Create Subject Group
  const subjectGroup = await prisma.subjectGroup.upsert({
    where: { id: 'default-subject-group' },
    update: {},
    create: {
      id: 'default-subject-group',
      name: 'Core Subjects',
      description: 'Basic academic subjects',
      classGroupId: classGroup.id
    }
  });

  console.log(`📝 Subject Group created: ${subjectGroup.name}`);

  // Create Subjects
  const subjects = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' },
    { name: 'History', code: 'HIST' }
  ];

  for (const subj of subjects) {
    await prisma.subject.upsert({
      where: { id: `subject-${subj.code.toLowerCase()}` },
      update: {},
      create: {
        id: `subject-${subj.code.toLowerCase()}`,
        name: subj.name,
        code: subj.code,
        subjectGroupId: subjectGroup.id
      }
    });
  }

  console.log(`📚 Subjects created: ${subjects.map(s => s.name).join(', ')}`);

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
