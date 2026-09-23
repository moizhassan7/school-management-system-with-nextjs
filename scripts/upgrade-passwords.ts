import { prisma } from '../lib/prisma';
import { upgradeLegacyPasswordHashes } from '../lib/password-upgrade';

upgradeLegacyPasswordHashes()
  .then((count) => {
    console.log(`Wrapped ${count} legacy password hashes`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
