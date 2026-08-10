import { PrismaClient, Role } from '@prisma/client';
import crypto from 'crypto';
import { seedPermissionCatalog } from '../lib/permissions';

const prisma = new PrismaClient();

const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function grantCampusAccess(userId: string, campusIds: string[]) {
  for (const campusId of campusIds) {
    await prisma.campusAccess.upsert({
      where: { userId_campusId: { userId, campusId } },
      update: {},
      create: { userId, campusId },
    });
  }
}

async function main() {
  console.log('🌱 Starting minimal seed (super admin only)...');

  const school = await prisma.school.upsert({
    where: { id: 'default-school' },
    update: {},
    create: {
      id: 'default-school',
      name: 'The Harvard Schools',
      initials: 'HHS',
      address: '100 Harvard St, Cambridge, MA 02138',
      email: 'info@harvard.edu',
      phone: '555-0123',
    },
  });
  console.log(`🏫 School: ${school.name}`);

  const campus = await prisma.campus.upsert({
    where: { id: 'default-campus' },
    update: {},
    create: {
      id: 'default-campus',
      name: 'Main Campus',
      address: '100 Harvard St, Cambridge, MA 02138',
      phone: '555-0123',
      email: 'campus@harvard.edu',
      schoolId: school.id,
    },
  });
  console.log(`🏫 Campus: ${campus.name}`);

  const hashedPassword = hashPassword('password123');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@school.com' },
    update: {
      role: Role.SUPER_ADMIN,
      username: 'superadmin',
      passwordHash: hashedPassword,
      schoolId: school.id,
      emailVerified: true,
    },
    create: {
      email: 'super@school.com',
      username: 'superadmin',
      name: 'Super Admin',
      passwordHash: hashedPassword,
      role: Role.SUPER_ADMIN,
      schoolId: school.id,
      emailVerified: true,
    },
  });
  console.log(`👤 SUPER_ADMIN: ${superAdmin.email}`);

  await seedPermissionCatalog(prisma);
  console.log('🔐 Permission catalog and role defaults seeded');

  await grantCampusAccess(superAdmin.id, [campus.id]);
  console.log('🏫 Campus access granted to super admin');

  console.log('\n✅ Seed finished\n');
  console.log('🔑 Login:');
  console.log('   Email / username: super@school.com / superadmin');
  console.log('   Password: password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
