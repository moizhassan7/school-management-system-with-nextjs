import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { BiometricDeviceDashboard } from '@/components/biometric/device-dashboard';

export default async function AttendanceDevicesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!['SUPER_ADMIN', 'ADMIN'].includes(String(session.user.role))) redirect('/attendance');

  const schoolFilter = session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' };
  const [devices, gateways, campuses, events] = await Promise.all([
    prisma.biometricDevice.findMany({
      where: { ...schoolFilter, archivedAt: null },
      include: {
        campus: { select: { id: true, name: true } },
        gateway: { select: { id: true, name: true, status: true, lastHeartbeatAt: true } },
        _count: { select: { mappings: true, events: true, syncJobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.biometricGateway.findMany({
      where: schoolFilter,
      include: { campus: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.campus.findMany({ where: schoolFilter, orderBy: { name: 'asc' } }),
    prisma.biometricAttendanceEvent.findMany({
      where: schoolFilter,
      include: { device: { select: { name: true } } },
      orderBy: { eventTimestamp: 'desc' },
      take: 12,
    }),
  ]);

  return (
    <BiometricDeviceDashboard
      initialDevices={JSON.parse(JSON.stringify(devices.map(({ passwordEncrypted, ...device }) => device)))}
      initialGateways={JSON.parse(JSON.stringify(gateways))}
      campuses={JSON.parse(JSON.stringify(campuses))}
      recentEvents={JSON.parse(JSON.stringify(events))}
    />
  );
}
