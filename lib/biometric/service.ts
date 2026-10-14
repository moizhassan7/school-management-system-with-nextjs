import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { encryptSecret } from './crypto';
import { assertPrivateLanIp } from './network';

export function sanitizeDevice<T extends Record<string, any>>(device: T) {
  const { passwordEncrypted, ...rest } = device;
  return rest;
}

export function buildGatewaySecret() {
  return randomBytes(32).toString('base64url');
}

export async function createGateway(input: {
  schoolId: string;
  campusId?: string | null;
  name: string;
  code: string;
  label?: string;
}) {
  const secret = buildGatewaySecret();
  const secretHash = await bcrypt.hash(secret, 12);
  const keyId = `gw_${randomBytes(12).toString('hex')}`;

  const gateway = await prisma.biometricGateway.create({
    data: {
      schoolId: input.schoolId,
      campusId: input.campusId || null,
      name: input.name,
      code: input.code,
      credentials: {
        create: {
          keyId,
          secretHash,
          label: input.label || 'Initial gateway credential',
        },
      },
    },
    include: { credentials: { select: { keyId: true, createdAt: true } } },
  });

  return { gateway, credential: { keyId, secret } };
}

export async function createBiometricDevice(input: {
  schoolId: string;
  campusId: string;
  gatewayId: string;
  name: string;
  model: string;
  lanIp: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS';
  username: string;
  password: string;
  location?: string | null;
  attendanceRole: string;
  syncIntervalSeconds: number;
  actorId?: string;
}) {
  assertPrivateLanIp(input.lanIp);

  const [campus, gateway] = await Promise.all([
    prisma.campus.findFirst({ where: { id: input.campusId, schoolId: input.schoolId } }),
    prisma.biometricGateway.findFirst({ where: { id: input.gatewayId, schoolId: input.schoolId, isActive: true } }),
  ]);
  if (!campus) throw Object.assign(new Error('Campus not found for this school'), { status: 400 });
  if (!gateway) throw Object.assign(new Error('Gateway not found for this school'), { status: 400 });

  return prisma.$transaction(async (tx) => {
    const device = await tx.biometricDevice.create({
      data: {
        schoolId: input.schoolId,
        campusId: input.campusId,
        gatewayId: input.gatewayId,
        name: input.name,
        model: input.model,
        lanIp: input.lanIp,
        port: input.port,
        protocol: input.protocol,
        username: input.username,
        passwordEncrypted: encryptSecret(input.password),
        location: input.location || null,
        attendanceRole: input.attendanceRole,
        syncIntervalSeconds: input.syncIntervalSeconds,
      },
      include: { campus: true, gateway: true },
    });
    await tx.biometricAuditLog.create({
      data: {
        schoolId: input.schoolId,
        gatewayId: input.gatewayId,
        deviceId: device.id,
        actorId: input.actorId,
        action: 'DEVICE_CREATED',
        targetType: 'BiometricDevice',
        targetId: device.id,
        metadata: { lanIp: input.lanIp, model: input.model },
      },
    });
    return device;
  });
}

export async function enqueueDeviceJob(input: {
  schoolId: string;
  gatewayId?: string | null;
  deviceId?: string | null;
  type:
    | 'TEST_CONNECTION'
    | 'PROBE_CAPABILITIES'
    | 'SYNC_ATTENDANCE'
    | 'SYNC_USERS'
    | 'ENROLL_USER'
    | 'REMOVE_USER'
    | 'BACKFILL_EVENTS';
  payload?: unknown;
  createdById?: string;
  idempotencyKey?: string;
}) {
  const idempotencyKey = input.idempotencyKey || randomUUID();
  return prisma.biometricSyncJob.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      schoolId: input.schoolId,
      gatewayId: input.gatewayId || null,
      deviceId: input.deviceId || null,
      type: input.type,
      payload: input.payload as any,
      createdById: input.createdById,
      idempotencyKey,
    },
  });
}

export function normalizeGatewayDeviceStatus(online: boolean) {
  return online ? 'ONLINE' : 'OFFLINE';
}
