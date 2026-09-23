import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export async function isLoginRateLimited(key: string): Promise<boolean> {
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!row || row.resetAt.getTime() < Date.now()) return false;
  return row.count >= MAX_FAILURES;
}

/** Atomic increment so two app processes cannot both reset the counter. */
export async function recordLoginFailure(key: string): Promise<void> {
  const resetAt = new Date(Date.now() + WINDOW_MS);
  await prisma.$executeRaw`
    INSERT INTO "LoginAttempt" ("id", "key", "count", "resetAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${key}, 1, ${resetAt}, NOW())
    ON CONFLICT ("key") DO UPDATE
    SET
      "count" = CASE
        WHEN "LoginAttempt"."resetAt" < NOW() THEN 1
        ELSE "LoginAttempt"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "LoginAttempt"."resetAt" < NOW() THEN EXCLUDED."resetAt"
        ELSE "LoginAttempt"."resetAt"
      END,
      "updatedAt" = NOW()
  `;
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
