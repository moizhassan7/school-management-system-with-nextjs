import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function keyMaterial() {
  const configured = process.env.BIOMETRIC_CREDENTIAL_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!configured) {
    throw new Error('BIOMETRIC_CREDENTIAL_KEY or AUTH_SECRET is required for biometric credential encryption');
  }
  return createHash('sha256').update(configured).digest();
}

export function encryptSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(cipherText: string) {
  const [version, iv, tag, encrypted] = cipherText.split(':');
  if (version !== 'v1' || !iv || !tag || !encrypted) {
    throw new Error('Unsupported encrypted biometric secret format');
  }
  const decipher = createDecipheriv('aes-256-gcm', keyMaterial(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
