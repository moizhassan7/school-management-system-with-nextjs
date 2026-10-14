import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { encryptSecret } from '../lib/biometric/crypto';

const prisma = new PrismaClient();

function loadDotenv() {
  if (!existsSync('.env')) return;
  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredPrivateIp(value: string) {
  const parts = value.split('.').map(Number);
  const [a, b] = parts;
  const ok =
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254));
  if (!ok) throw new Error('HIKVISION_DEVICE_IP must be a private LAN IPv4 address');
}

function stableGatewayCode(seed: string) {
  return `hikvision-${createHash('sha1').update(seed).digest('hex').slice(0, 8)}`;
}

async function main() {
  loadDotenv();

  const school = process.env.BIOMETRIC_SEED_SCHOOL_ID
    ? await prisma.school.findUnique({ where: { id: process.env.BIOMETRIC_SEED_SCHOOL_ID } })
    : await prisma.school.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!school) throw new Error('No school found. Run the main seed first.');

  const campus = process.env.BIOMETRIC_SEED_CAMPUS_ID
    ? await prisma.campus.findFirst({ where: { id: process.env.BIOMETRIC_SEED_CAMPUS_ID, schoolId: school.id } })
    : await prisma.campus.findFirst({ where: { schoolId: school.id }, orderBy: { createdAt: 'asc' } });
  if (!campus) throw new Error('No campus found for the selected school.');

  const deviceIp = process.env.HIKVISION_DEVICE_IP || '192.168.1.64';
  requiredPrivateIp(deviceIp);

  const gatewayCode = process.env.BIOMETRIC_GATEWAY_CODE || stableGatewayCode(`${school.id}:${campus.id}`);
  const gatewayName = process.env.BIOMETRIC_GATEWAY_NAME || 'Main LAN Hikvision Gateway';
  const gatewaySecret = process.env.BIOMETRIC_GATEWAY_SECRET || randomBytes(32).toString('base64url');
  const gatewayKeyId = process.env.BIOMETRIC_GATEWAY_KEY_ID || `gw_${randomBytes(12).toString('hex')}`;

  const gateway = await prisma.biometricGateway.upsert({
    where: { code: gatewayCode },
    update: {
      name: gatewayName,
      schoolId: school.id,
      campusId: campus.id,
      isActive: true,
      status: 'PENDING',
    },
    create: {
      name: gatewayName,
      code: gatewayCode,
      schoolId: school.id,
      campusId: campus.id,
    },
  });

  const existingCredential = await prisma.biometricGatewayCredential.findFirst({
    where: { gatewayId: gateway.id, active: true },
    select: { keyId: true },
  });
  if (!existingCredential) {
    await prisma.biometricGatewayCredential.create({
      data: {
        gatewayId: gateway.id,
        keyId: gatewayKeyId,
        secretHash: await bcrypt.hash(gatewaySecret, 12),
        label: 'Seeded gateway credential',
      },
    });
  }

  const username = process.env.HIKVISION_DEVICE_USERNAME || 'admin';
  const password = process.env.HIKVISION_DEVICE_PASSWORD || 'CHANGE_ME_BEFORE_TESTING';
  const deviceName = process.env.HIKVISION_DEVICE_NAME || 'Main Gate DS-K1T342MFX';

  const existing = await prisma.biometricDevice.findFirst({
    where: { gatewayId: gateway.id, lanIp: deviceIp, port: Number(process.env.HIKVISION_DEVICE_PORT || 80) },
  });

  const device = existing
    ? await prisma.biometricDevice.update({
        where: { id: existing.id },
        data: {
          name: deviceName,
          schoolId: school.id,
          campusId: campus.id,
          model: 'DS-K1T342MFX',
          username,
          passwordEncrypted: encryptSecret(password),
          protocol: process.env.HIKVISION_DEVICE_PROTOCOL === 'HTTPS' ? 'HTTPS' : 'HTTP',
          syncIntervalSeconds: Number(process.env.HIKVISION_SYNC_INTERVAL_SECONDS || 60),
          isActive: true,
          archivedAt: null,
        },
      })
    : await prisma.biometricDevice.create({
        data: {
          name: deviceName,
          schoolId: school.id,
          campusId: campus.id,
          gatewayId: gateway.id,
          model: 'DS-K1T342MFX',
          lanIp: deviceIp,
          port: Number(process.env.HIKVISION_DEVICE_PORT || 80),
          protocol: process.env.HIKVISION_DEVICE_PROTOCOL === 'HTTPS' ? 'HTTPS' : 'HTTP',
          username,
          passwordEncrypted: encryptSecret(password),
          location: process.env.HIKVISION_DEVICE_LOCATION || 'Main gate',
          attendanceRole: process.env.HIKVISION_ATTENDANCE_ROLE || 'ENTRY',
          syncIntervalSeconds: Number(process.env.HIKVISION_SYNC_INTERVAL_SECONDS || 60),
        },
      });

  console.log('Biometric seed complete');
  console.log(`Gateway: ${gateway.name} (${gateway.code})`);
  console.log(`Device: ${device.name} ${device.lanIp}:${device.port}`);
  if (!existingCredential) {
    console.log('Gateway credential, save this in gateway/.env:');
    console.log(`GATEWAY_KEY_ID=${gatewayKeyId}`);
    console.log(`GATEWAY_SECRET=${gatewaySecret}`);
  } else {
    console.log(`Existing active gateway key: ${existingCredential.keyId}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
