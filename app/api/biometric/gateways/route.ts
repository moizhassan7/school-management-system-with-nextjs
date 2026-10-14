import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope } from '@/lib/authz';
import { createGateway, sanitizeDevice } from '@/lib/biometric/service';
import { gatewayCreateSchema } from '@/lib/biometric/schemas';

export async function GET() {
  const { session, error } = await requirePermission('ATTENDANCE', 'VIEW');
  if (error) return error;
  const gateways = await prisma.biometricGateway.findMany({
    where: { ...schoolScope(session) },
    include: { campus: true, devices: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(gateways.map(sanitizeDevice));
}

export async function POST(request: Request) {
  const { session, error } = await requirePermission('ATTENDANCE', 'CREATE');
  if (error) return error;
  if (!session.user.schoolId) {
    return NextResponse.json({ error: 'School is required' }, { status: 400 });
  }

  try {
    const data = gatewayCreateSchema.parse(await request.json());
    if (data.campusId) {
      const campus = await prisma.campus.findFirst({
        where: { id: data.campusId, schoolId: session.user.schoolId },
      });
      if (!campus) return NextResponse.json({ error: 'Campus not found' }, { status: 400 });
    }
    const result = await createGateway({
      schoolId: session.user.schoolId,
      campusId: data.campusId,
      name: data.name,
      code: data.code,
      label: data.label,
    });
    await prisma.biometricAuditLog.create({
      data: {
        schoolId: session.user.schoolId,
        gatewayId: result.gateway.id,
        actorId: session.user.id,
        action: 'GATEWAY_CREATED',
        targetType: 'BiometricGateway',
        targetId: result.gateway.id,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number })?.status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid gateway' }, { status });
  }
}
