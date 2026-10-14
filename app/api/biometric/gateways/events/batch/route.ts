import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateGateway } from '@/lib/biometric/gateway-auth';
import { eventBatchSchema } from '@/lib/biometric/schemas';

export async function POST(request: Request) {
  try {
    const gateway = await authenticateGateway(request);
    const body = eventBatchSchema.parse(await request.json());
    const accepted: string[] = [];
    const duplicates: string[] = [];
    const rejected: { key: string; reason: string }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const event of body.events) {
        const device = await tx.biometricDevice.findFirst({
          where: { id: event.deviceId, gatewayId: gateway.id, schoolId: gateway.schoolId, archivedAt: null },
        });
        if (!device) {
          rejected.push({ key: event.idempotencyKey, reason: 'Device not authorized for gateway' });
          continue;
        }
        const mapping = event.employeeNo
          ? await tx.biometricPersonMapping.findFirst({
              where: { deviceId: device.id, deviceEmployeeNo: event.employeeNo, isActive: true },
            })
          : null;

        try {
          await tx.biometricAttendanceEvent.create({
            data: {
              schoolId: gateway.schoolId,
              deviceId: device.id,
              mappingId: mapping?.id,
              sourceEventKey: event.idempotencyKey,
              gatewayEventId: event.gatewayEventId,
              deviceSerial: event.deviceSerial,
              employeeNo: event.employeeNo,
              eventTimestamp: new Date(event.eventTimestamp),
              verificationMethod: event.verificationMethod,
              eventType: event.eventType,
              direction: event.direction,
              status: mapping ? 'MATCHED' : 'UNMATCHED',
              rawPayload: event.rawPayload as any,
            },
          });
          if (mapping) {
            await tx.biometricPersonMapping.update({
              where: { id: mapping.id },
              data: { latestScanAt: new Date(event.eventTimestamp) },
            });
          }
          accepted.push(event.idempotencyKey);
        } catch (error) {
          if ((error as { code?: string })?.code === 'P2002') duplicates.push(event.idempotencyKey);
          else rejected.push({ key: event.idempotencyKey, reason: 'Failed to persist event' });
        }
      }
    });

    return NextResponse.json({ batchId: body.batchId, accepted, duplicates, rejected });
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Event batch rejected' }, { status });
  }
}
