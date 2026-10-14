import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateGateway } from '@/lib/biometric/gateway-auth';
import { heartbeatSchema } from '@/lib/biometric/schemas';
import { normalizeGatewayDeviceStatus } from '@/lib/biometric/service';

export async function POST(request: Request) {
  try {
    const gateway = await authenticateGateway(request);
    const body = heartbeatSchema.parse(await request.json());
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.biometricGateway.update({
        where: { id: gateway.id },
        data: {
          status: 'ONLINE',
          lastHeartbeatAt: now,
          version: body.version,
          hostInfo: body.hostInfo as any,
        },
      });

      for (const device of body.devices || []) {
        const owned = await tx.biometricDevice.findFirst({
          where: { id: device.deviceId, gatewayId: gateway.id, schoolId: gateway.schoolId },
        });
        if (!owned) continue;
        await tx.biometricDevice.update({
          where: { id: owned.id },
          data: {
            status: normalizeGatewayDeviceStatus(device.online),
            lastSeenAt: device.online ? now : owned.lastSeenAt,
            lastTestedAt: now,
            serialNumber: typeof device.deviceInfo?.serialNumber === 'string' ? device.deviceInfo.serialNumber : owned.serialNumber,
            firmwareVersion:
              typeof device.deviceInfo?.firmwareVersion === 'string' ? device.deviceInfo.firmwareVersion : owned.firmwareVersion,
            capabilities: device.capabilities ? (device.capabilities as any) : owned.capabilities,
          },
        });
        await tx.biometricDeviceHealthLog.create({
          data: {
            gatewayId: gateway.id,
            deviceId: owned.id,
            status: device.online ? 'ONLINE' : 'OFFLINE',
            latencyMs: device.latencyMs,
            message: device.message,
            details: { deviceInfo: device.deviceInfo, capabilities: device.capabilities } as any,
          },
        });
      }
    });

    return NextResponse.json({ ok: true, acceptedAt: now.toISOString() });
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Heartbeat rejected' }, { status });
  }
}
