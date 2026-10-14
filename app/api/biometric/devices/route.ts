import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope } from '@/lib/authz';
import { createBiometricDevice, sanitizeDevice } from '@/lib/biometric/service';
import { deviceCreateSchema } from '@/lib/biometric/schemas';

export async function GET() {
  const { session, error } = await requirePermission('ATTENDANCE', 'VIEW');
  if (error) return error;

  const devices = await prisma.biometricDevice.findMany({
    where: { ...schoolScope(session), archivedAt: null },
    include: {
      campus: { select: { id: true, name: true } },
      gateway: { select: { id: true, name: true, status: true, lastHeartbeatAt: true } },
      _count: { select: { mappings: true, events: true, syncJobs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(devices.map(sanitizeDevice));
}

export async function POST(request: Request) {
  const { session, error } = await requirePermission('ATTENDANCE', 'CREATE');
  if (error) return error;
  if (!session.user.schoolId) return NextResponse.json({ error: 'School is required' }, { status: 400 });

  try {
    const data = deviceCreateSchema.parse(await request.json());
    const device = await createBiometricDevice({
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      ...data,
    });
    return NextResponse.json(sanitizeDevice(device), { status: 201 });
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid device' }, { status });
  }
}
