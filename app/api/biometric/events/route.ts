import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope } from '@/lib/authz';

export async function GET(request: Request) {
  const { session, error } = await requirePermission('ATTENDANCE', 'VIEW');
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const deviceId = searchParams.get('deviceId') || undefined;
  const take = Math.min(200, Math.max(1, Number(searchParams.get('take') || 50)));

  const events = await prisma.biometricAttendanceEvent.findMany({
    where: {
      ...schoolScope(session),
      ...(status ? { status: status as any } : {}),
      ...(deviceId ? { deviceId } : {}),
    },
    include: {
      device: { select: { id: true, name: true, serialNumber: true } },
      mapping: { select: { id: true, personType: true, deviceEmployeeNo: true, studentRecordId: true, staffRecordId: true } },
    },
    orderBy: { eventTimestamp: 'desc' },
    take,
  });

  return NextResponse.json(events);
}
