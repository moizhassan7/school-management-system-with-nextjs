import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { enqueueDeviceJob } from '@/lib/biometric/service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission('ATTENDANCE', 'EDIT');
  if (error) return error;
  const { id } = await params;
  const device = await prisma.biometricDevice.findFirst({
    where: {
      id,
      archivedAt: null,
      ...(session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' }),
    },
  });
  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  if (!device.gatewayId) return NextResponse.json({ error: 'Device must be assigned to a gateway' }, { status: 400 });

  const job = await enqueueDeviceJob({
    schoolId: device.schoolId,
    gatewayId: device.gatewayId,
    deviceId: device.id,
    type: 'TEST_CONNECTION',
    createdById: session.user.id,
    payload: { requestedAt: new Date().toISOString() },
  });
  return NextResponse.json({ job });
}
