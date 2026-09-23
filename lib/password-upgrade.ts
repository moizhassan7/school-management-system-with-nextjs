import { prisma } from '@/lib/prisma';
import { isBcryptHash, isLegacySha256Hex, SHA256_BCRYPT_PREFIX, wrapLegacySha256 } from '@/lib/password';

const BATCH = 8;

/** Replace raw SHA-256 password hashes with bcrypt(sha256) so they are not stored as fast hashes. */
export async function upgradeLegacyPasswordHashes(): Promise<number> {
  const users = await prisma.user.findMany({
    select: { id: true, passwordHash: true },
  });
  const legacy = users.filter(
    (user) =>
      !isBcryptHash(user.passwordHash) &&
      !user.passwordHash.startsWith(SHA256_BCRYPT_PREFIX) &&
      isLegacySha256Hex(user.passwordHash)
  );

  let updated = 0;
  for (let i = 0; i < legacy.length; i += BATCH) {
    const slice = legacy.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (user) => {
        const passwordHash = await wrapLegacySha256(user.passwordHash);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      })
    );
    updated += slice.length;
    console.log(`Wrapped ${updated}/${legacy.length} password hashes`);
  }
  return updated;
}

let scheduled = false;

export function schedulePasswordUpgrade() {
  if (scheduled) return;
  scheduled = true;
  void upgradeLegacyPasswordHashes().catch((error) => {
    console.error('Password hash upgrade failed', error);
    scheduled = false;
  });
}
