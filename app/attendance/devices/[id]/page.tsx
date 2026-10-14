import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function BiometricDeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const device = await prisma.biometricDevice.findFirst({
    where: {
      id,
      ...(session.user.role === 'SUPER_ADMIN' ? {} : { schoolId: session.user.schoolId || '__none__' }),
    },
    include: {
      campus: true,
      gateway: true,
      mappings: { take: 50, orderBy: { updatedAt: 'desc' } },
      events: { take: 50, orderBy: { eventTimestamp: 'desc' } },
      syncJobs: { take: 25, orderBy: { createdAt: 'desc' } },
      healthLogs: { take: 25, orderBy: { recordedAt: 'desc' } },
    },
  });
  if (!device) notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-2 px-0">
              <Link href="/attendance/devices">Back to devices</Link>
            </Button>
            <h1 className="text-3xl font-bold">{device.name}</h1>
            <p className="text-sm text-muted-foreground">
              {device.lanIp}:{device.port} · {device.model} · {device.campus.name}
            </p>
          </div>
          <Badge variant={device.status === 'ONLINE' ? 'default' : 'secondary'}>{device.status}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Summary title="Gateway" value={device.gateway?.name || 'Unassigned'} detail={device.gateway?.status || ''} />
          <Summary title="Mappings" value={String(device.mappings.length)} detail="people assigned" />
          <Summary title="Events" value={String(device.events.length)} detail="latest loaded" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Capabilities</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(device.capabilities || { status: 'Not probed yet' }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent sync jobs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {device.syncJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{job.type}</span>
                  <Badge variant={job.status === 'FAILED' ? 'destructive' : 'secondary'}>{job.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {device.events.map((event) => (
                <div key={event.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{event.employeeNo || 'Unknown employee'}</span>
                    <Badge variant={event.status === 'UNMATCHED' ? 'destructive' : 'secondary'}>{event.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{event.eventTimestamp.toLocaleString()}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Summary({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}
