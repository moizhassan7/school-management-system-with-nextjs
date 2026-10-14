import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope } from '@/lib/authz';

export async function GET() {
  const { session, error } = await requirePermission('ATTENDANCE', 'VIEW');
  if (error) return error;
  const scope = schoolScope(session);

  const [devices, gateways, unmatchedEvents, failedJobs, recentEvents] = await Promise.all([
    prisma.biometricDevice.groupBy({
      by: ['status'],
      where: { ...scope, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.biometricGateway.groupBy({
      by: ['status'],
      where: { ...scope },
      _count: { _all: true },
    }),
    prisma.biometricAttendanceEvent.count({ where: { ...scope, status: 'UNMATCHED' } }),
    prisma.biometricSyncJob.count({ where: { ...scope, status: 'FAILED' } }),
    prisma.biometricAttendanceEvent.findMany({
      where: { ...scope },
      include: { device: { select: { id: true, name: true } } },
      orderBy: { eventTimestamp: 'desc' },
      take: 10,
    }),
  ]);

  return NextResponse.json({ devices, gateways, unmatchedEvents, failedJobs, recentEvents });
}
