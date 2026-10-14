import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateGateway } from '@/lib/biometric/gateway-auth';
import { decryptSecret } from '@/lib/biometric/crypto';

export async function GET(request: Request) {
  try {
    const gateway = await authenticateGateway(request);
    const now = new Date();
    const jobs = await prisma.$transaction(async (tx) => {
      const pending = await tx.biometricSyncJob.findMany({
        where: {
          gatewayId: gateway.id,
          status: 'PENDING',
          OR: [{ notBefore: null }, { notBefore: { lte: now } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 25,
        include: { device: true },
      });
      if (pending.length) {
        await tx.biometricSyncJob.updateMany({
          where: { id: { in: pending.map((job) => job.id) }, status: 'PENDING' },
          data: { status: 'DISPATCHED', dispatchedAt: now },
        });
      }
      return pending;
    });

    return NextResponse.json({
      commands: jobs.map((job) => ({
        id: job.id,
        type: job.type,
        deviceId: job.deviceId,
        payload: {
          ...(job.payload && typeof job.payload === 'object' ? job.payload : {}),
          device: job.device
            ? {
                id: job.device.id,
                lanIp: job.device.lanIp,
                port: job.device.port,
                protocol: job.device.protocol,
                username: job.device.username,
                password: decryptSecret(job.device.passwordEncrypted),
                model: job.device.model,
              }
            : undefined,
        },
        idempotencyKey: job.idempotencyKey,
      })),
    });
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Commands unavailable' }, { status });
  }
}
