/**
 * One-off / re-runnable seed for permissions + campus backfill.
 * Run: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/seed-permissions.ts
 */
import { PrismaClient, Role } from '@prisma/client';
import { seedPermissionCatalog } from '../lib/permissions';

const prisma = new PrismaClient();

async function main() {
  await seedPermissionCatalog(prisma);
  console.log('Permission catalog seeded');

  const staffLike = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: {
        in: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.ACCOUNTANT, Role.STAFF],
      },
    },
    select: { id: true, schoolId: true },
  });

  for (const u of staffLike) {
    const campuses = await prisma.campus.findMany({
      where: { schoolId: u.schoolId },
      select: { id: true },
    });
    for (const c of campuses) {
      await prisma.campusAccess.upsert({
        where: { userId_campusId: { userId: u.id, campusId: c.id } },
        update: {},
        create: { userId: u.id, campusId: c.id },
      });
    }
  }
  console.log(`Campus access backfilled for ${staffLike.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
