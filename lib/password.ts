import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
export const SHA256_BCRYPT_PREFIX = 'sha256$';

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

export function isLegacySha256Hex(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

export function legacySha256(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** bcrypt(sha256 hex). Removes the raw fast hash from the database before the user logs in again. */
export async function wrapLegacySha256(sha256Hex: string): Promise<string> {
  return SHA256_BCRYPT_PREFIX + (await bcrypt.hash(sha256Hex, BCRYPT_ROUNDS));
}

/** Verify bcrypt, wrapped SHA-256, or a raw legacy hash. Login replaces anything except direct bcrypt. */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (!stored) return { ok: false, needsUpgrade: false };

  if (stored.startsWith(SHA256_BCRYPT_PREFIX)) {
    const ok = await bcrypt.compare(legacySha256(password), stored.slice(SHA256_BCRYPT_PREFIX.length));
    return { ok, needsUpgrade: ok };
  }

  if (isBcryptHash(stored)) {
    const ok = await bcrypt.compare(password, stored);
    return { ok, needsUpgrade: false };
  }

  const ok = legacySha256(password) === stored;
  return { ok, needsUpgrade: ok };
}

export function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}
