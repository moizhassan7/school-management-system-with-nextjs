'use client';

import { useEffect, useMemo, useState } from 'react';
import { Fingerprint, RefreshCw, Router, ScanFace } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Mapping = {
  id: string;
  deviceEmployeeNo: string;
  enrollmentStatus: string;
  faceStatus: string;
  fingerprintStatus: string;
  latestScanAt?: string | null;
  lastError?: string | null;
  device: { id: string; name: string; status: string; location?: string | null; campus?: { name: string } };
};

type Device = {
  id: string;
  name: string;
  status: string;
  location?: string | null;
  campus?: { name: string };
};

export function PersonBiometricTab({
  personType,
  studentRecordId,
  staffRecordId,
}: {
  personType: 'STUDENT' | 'STAFF';
  studentRecordId?: string;
  staffRecordId?: string;
}) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const recordQuery = useMemo(() => {
    return personType === 'STUDENT'
      ? `studentRecordId=${encodeURIComponent(studentRecordId || '')}`
      : `staffRecordId=${encodeURIComponent(staffRecordId || '')}`;
  }, [personType, staffRecordId, studentRecordId]);

  const load = async () => {
    if ((personType === 'STUDENT' && !studentRecordId) || (personType === 'STAFF' && !staffRecordId)) return;
    setLoading(true);
    try {
      const [mappingRes, deviceRes] = await Promise.all([
        fetch(`/api/biometric/person-mappings?${recordQuery}`),
        fetch('/api/biometric/devices'),
      ]);
      if (!mappingRes.ok || !deviceRes.ok) throw new Error('Failed to load biometric data');
      setMappings(await mappingRes.json());
      setDevices(await deviceRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load biometric data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [recordQuery]);

  const assign = async () => {
    if (!deviceId) return;
    try {
      const res = await fetch('/api/biometric/person-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, personType, studentRecordId, staffRecordId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to assign device');
      toast.success('Device assignment queued for sync');
      setDeviceId('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign device');
    }
  };

  return (
    <div className="space-y-4 pt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Biometric attendance</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger className="sm:max-w-md">
                <SelectValue placeholder="Assign a device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name} · {device.campus?.name || 'No campus'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={assign} disabled={!deviceId}>
              <Router className="mr-2 h-4 w-4" /> Assign device
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading biometric status...</div>
          ) : mappings.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No biometric device assignment has been created yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium">{mapping.device.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Employee no. {mapping.deviceEmployeeNo} · {mapping.device.campus?.name || 'No campus'}
                      </div>
                    </div>
                    <Badge variant={mapping.device.status === 'ONLINE' ? 'default' : 'secondary'}>
                      {mapping.device.status}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Router className="h-4 w-4 text-muted-foreground" />
                      {mapping.enrollmentStatus.replaceAll('_', ' ')}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ScanFace className="h-4 w-4 text-muted-foreground" />
                      {mapping.faceStatus.replaceAll('_', ' ')}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Fingerprint className="h-4 w-4 text-muted-foreground" />
                      {mapping.fingerprintStatus.replaceAll('_', ' ')}
                    </div>
                  </div>
                  {mapping.latestScanAt ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Latest scan {new Date(mapping.latestScanAt).toLocaleString()}
                    </div>
                  ) : null}
                  {mapping.lastError ? <div className="mt-3 text-sm text-destructive">{mapping.lastError}</div> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
