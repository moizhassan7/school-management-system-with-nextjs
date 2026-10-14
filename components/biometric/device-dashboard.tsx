'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Fingerprint, Plus, RefreshCw, Router, ShieldCheck, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  initialDevices: any[];
  initialGateways: any[];
  campuses: any[];
  recentEvents: any[];
};

export function BiometricDeviceDashboard({ initialDevices, initialGateways, campuses, recentEvents }: Props) {
  const [devices, setDevices] = useState(initialDevices);
  const [gateways, setGateways] = useState(initialGateways);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    model: 'DS-K1T342MFX',
    gatewayId: initialGateways[0]?.id || '',
    campusId: campuses[0]?.id || '',
    lanIp: '',
    port: 80,
    username: '',
    password: '',
    protocol: 'HTTP',
    location: '',
    attendanceRole: 'ENTRY',
    syncIntervalSeconds: 60,
  });

  const stats = useMemo(() => {
    return {
      online: devices.filter((device) => device.status === 'ONLINE').length,
      offline: devices.filter((device) => device.status === 'OFFLINE').length,
      gatewaysOnline: gateways.filter((gateway) => gateway.status === 'ONLINE').length,
      unmatched: recentEvents.filter((event) => event.status === 'UNMATCHED').length,
    };
  }, [devices, gateways, recentEvents]);

  const refresh = async () => {
    const [deviceRes, gatewayRes] = await Promise.all([
      fetch('/api/biometric/devices'),
      fetch('/api/biometric/gateways'),
    ]);
    if (deviceRes.ok) setDevices(await deviceRes.json());
    if (gatewayRes.ok) setGateways(await gatewayRes.json());
  };

  const createDevice = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/biometric/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to add device');
      toast.success('Device saved');
      setFormOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add device');
    } finally {
      setSaving(false);
    }
  };

  const queue = async (id: string, endpoint: 'test' | 'sync', body?: unknown) => {
    const res = await fetch(`/api/biometric/devices/${id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Failed to queue command');
      return;
    }
    toast.success('Gateway command queued');
    await refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">Attendance / Devices</div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Biometric devices</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Manage Hikvision LAN terminals through outbound local gateways.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => setFormOpen((value) => !value)}>
              <Plus className="mr-2 h-4 w-4" /> Add device
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Fingerprint />} label="Devices online" value={stats.online} />
          <Metric icon={<WifiOff />} label="Devices offline" value={stats.offline} />
          <Metric icon={<Router />} label="Gateways online" value={stats.gatewaysOnline} />
          <Metric icon={<Activity />} label="Unmatched scans" value={stats.unmatched} />
        </div>

        {formOpen ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Hikvision terminal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
              <Field label="LAN IP" value={form.lanIp} onChange={(lanIp) => setForm({ ...form, lanIp })} />
              <Field label="Port" value={String(form.port)} onChange={(port) => setForm({ ...form, port: Number(port) || 80 })} />
              <Field label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />
              <Field
                label="Password"
                value={form.password}
                type="password"
                onChange={(password) => setForm({ ...form, password })}
              />
              <Field label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
              <div className="space-y-2">
                <Label>Gateway</Label>
                <Select value={form.gatewayId} onValueChange={(gatewayId) => setForm({ ...form, gatewayId })}>
                  <SelectTrigger><SelectValue placeholder="Select gateway" /></SelectTrigger>
                  <SelectContent>
                    {gateways.map((gateway) => (
                      <SelectItem key={gateway.id} value={gateway.id}>{gateway.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campus</Label>
                <Select value={form.campusId} onValueChange={(campusId) => setForm({ ...form, campusId })}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>{campus.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Protocol</Label>
                <Select value={form.protocol} onValueChange={(protocol) => setForm({ ...form, protocol })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTTP">HTTP</SelectItem>
                    <SelectItem value="HTTPS">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button onClick={createDevice} disabled={saving || !form.gatewayId || !form.campusId}>
                  {saving ? 'Saving...' : 'Save device'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configured devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Add a gateway and terminal before biometric scans can sync.
              </div>
            ) : (
              devices.map((device) => (
                <div key={device.id} className="flex flex-col gap-4 rounded-lg border bg-white p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/attendance/devices/${device.id}`} className="font-semibold text-slate-950">
                        {device.name}
                      </Link>
                      <Badge variant={device.status === 'ONLINE' ? 'default' : 'secondary'}>{device.status}</Badge>
                      <Badge variant="outline">{device.model}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {device.lanIp}:{device.port} · {device.campus?.name || 'No campus'} · {device.gateway?.name || 'No gateway'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{device._count?.mappings || 0} mapped people</span>
                      <span>{device._count?.events || 0} raw events</span>
                      <span>every {device.syncIntervalSeconds}s</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => queue(device.id, 'test')}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => queue(device.id, 'sync', { mode: 'USERS' })}>
                      Sync users
                    </Button>
                    <Button size="sm" onClick={() => queue(device.id, 'sync', { mode: 'ATTENDANCE' })}>
                      Sync attendance
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
