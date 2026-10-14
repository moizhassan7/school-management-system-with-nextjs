import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { encryptSecret } from '@/lib/biometric/crypto';
import { assertPrivateLanIp } from '@/lib/biometric/network';
import { deviceUpdateSchema } from '@/lib/biometric/schemas';
import { sanitizeDevice } from '@/lib/biometric/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission('ATTENDANCE', 'VIEW');
  if (error) return error;
  const { id } = await params;
  const device = await prisma.biometricDevice.findFirst({
    where: {
      id,
      ...(session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' }),
    },
    include: {
      campus: true,
      gateway: { select: { id: true, name: true, code: true, status: true, lastHeartbeatAt: true } },
      mappings: { take: 25, orderBy: { updatedAt: 'desc' } },
      healthLogs: { take: 20, orderBy: { recordedAt: 'desc' } },
      syncJobs: { take: 20, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  return NextResponse.json(sanitizeDevice(device));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission('ATTENDANCE', 'EDIT');
  if (error) return error;
  const { id } = await params;
  const existing = await prisma.biometricDevice.findFirst({
    where: {
      id,
      ...(session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' }),
    },
  });
  if (!existing) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

  try {
    const data = deviceUpdateSchema.parse(await request.json());
    if (data.lanIp) assertPrivateLanIp(data.lanIp);
    const updated = await prisma.biometricDevice.update({
      where: { id },
      data: {
        name: data.name,
        model: data.model,
        campusId: data.campusId,
        gatewayId: data.gatewayId,
        lanIp: data.lanIp,
        port: data.port,
        protocol: data.protocol,
        username: data.username,
        passwordEncrypted: data.password ? encryptSecret(data.password) : undefined,
        location: data.location,
        attendanceRole: data.attendanceRole,
        syncIntervalSeconds: data.syncIntervalSeconds,
        isActive: data.isActive,
        archivedAt: data.archived ? new Date() : undefined,
        status: data.archived ? 'ARCHIVED' : undefined,
      },
      include: { campus: true, gateway: true },
    });
    await prisma.biometricAuditLog.create({
      data: {
        schoolId: existing.schoolId,
        gatewayId: updated.gatewayId,
        deviceId: id,
        actorId: session.user.id,
        action: data.archived ? 'DEVICE_ARCHIVED' : 'DEVICE_UPDATED',
        targetType: 'BiometricDevice',
        targetId: id,
      },
    });
    return NextResponse.json(sanitizeDevice(updated));
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid device update' }, { status });
  }
}
