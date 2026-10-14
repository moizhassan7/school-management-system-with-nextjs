import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateGateway } from '@/lib/biometric/gateway-auth';
import { commandResultSchema } from '@/lib/biometric/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gateway = await authenticateGateway(request);
    const { id } = await params;
    const body = commandResultSchema.parse(await request.json());
    const job = await prisma.biometricSyncJob.findFirst({
      where: { id, gatewayId: gateway.id, schoolId: gateway.schoolId },
    });
    if (!job) return NextResponse.json({ error: 'Command not found' }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.biometricSyncJob.update({
        where: { id },
        data: {
          status: body.status,
          result: body.result as any,
          error: body.error,
          acknowledgedAt: new Date(),
          completedAt: ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(body.status) ? new Date() : null,
        },
      });

      if (job.deviceId && body.status === 'SUCCEEDED' && body.result && typeof body.result === 'object') {
        const result = body.result as Record<string, any>;
        await tx.biometricDevice.update({
          where: { id: job.deviceId },
          data: {
            status: result.online === false ? 'OFFLINE' : 'ONLINE',
            lastTestedAt: new Date(),
            lastSeenAt: result.online === false ? undefined : new Date(),
            serialNumber: typeof result.deviceInfo?.serialNumber === 'string' ? result.deviceInfo.serialNumber : undefined,
            firmwareVersion:
              typeof result.deviceInfo?.firmwareVersion === 'string' ? result.deviceInfo.firmwareVersion : undefined,
            capabilities: result.capabilities ? (result.capabilities as any) : undefined,
          },
        });
      }

      if (job.deviceId) {
        await tx.biometricDeviceHealthLog.create({
          data: {
            gatewayId: gateway.id,
            deviceId: job.deviceId,
            status: body.status,
            message: body.error,
            details: body.result as any,
          },
        });
      }
      return saved;
    });

    return NextResponse.json({ ok: true, command: updated });
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Command result rejected' }, { status });
  }
}
