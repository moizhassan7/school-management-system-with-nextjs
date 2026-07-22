'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ACTIONS,
  MODULES,
  permissionKey,
  type ActionKey,
  type ModuleKey,
} from '@/lib/permissions';

const ASSIGNABLE_ROLES = [
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'STAFF',
  'STUDENT',
  'PARENT',
] as const;

interface CampusOption {
  id: string;
  name: string;
  schoolId: string;
}

interface SchoolOption {
  id: string;
  name: string;
  initials: string;
  campuses: CampusOption[];
}

interface UserFormProps {
  userId?: string;
  initialData?: {
    name: string;
    email: string;
    username?: string | null;
    phone?: string | null;
    schoolId: string;
    role: string;
    suspended: boolean;
    campusIds?: string[];
    permissionOverrides?: { module: string; action: string; granted: boolean }[];
  };
}

export default function UserForm({ userId, initialData }: UserFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionSchoolId = session?.user?.schoolId || '';
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState(initialData?.schoolId || '');
  const [role, setRole] = useState<string>(initialData?.role || 'STAFF');
  const [active, setActive] = useState(!(initialData?.suspended ?? false));
  const [campusIds, setCampusIds] = useState<string[]>(initialData?.campusIds || []);
  const [roleDefaults, setRoleDefaults] = useState<Set<string>>(new Set());
  const [matrix, setMatrix] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!schoolId && sessionSchoolId) setSchoolId(sessionSchoolId);
  }, [sessionSchoolId, schoolId]);

  useEffect(() => {
    let cancelled = false;
    setSchoolsLoading(true);
    fetch('/api/schools')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load schools');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) {
          setSchools([]);
          toast.error('No schools found. Create a school in Configuration first.');
          return;
        }
        const opts = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          initials: s.initials,
          campuses: (s.campuses || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            schoolId: s.id,
          })),
        }));
        setSchools(opts);
        setSchoolId((prev) => prev || sessionSchoolId || opts[0]?.id || '');
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load schools');
        }
      })
      .finally(() => {
        if (!cancelled) setSchoolsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionSchoolId]);

  useEffect(() => {
    if (!role || role === 'SUPER_ADMIN') {
      setRoleDefaults(new Set());
      return;
    }
    fetch(`/api/permissions/role-defaults?role=${role}`)
      .then((r) => r.json())
      .then((data) => {
        const defaults = new Set<string>(data.permissions || []);
        setRoleDefaults(defaults);

        const next: Record<string, boolean> = {};
        for (const module of MODULES) {
          for (const action of ACTIONS) {
            const key = permissionKey(module, action);
            next[key] = defaults.has(key);
          }
        }

        for (const o of initialData?.permissionOverrides || []) {
          const key = permissionKey(o.module, o.action);
          next[key] = o.granted;
        }
        setMatrix(next);
      })
      .catch(() => {});
  }, [role, userId]);

  const campusesForSchool = useMemo(
    () => schools.find((s) => s.id === schoolId)?.campuses || [],
    [schools, schoolId]
  );

  useEffect(() => {
    setCampusIds((prev) =>
      prev.filter((id) => campusesForSchool.some((c) => c.id === id))
    );
  }, [schoolId, campusesForSchool]);

  const toggleCampus = (id: string) => {
    setCampusIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePerm = (module: ModuleKey, action: ActionKey) => {
    const key = permissionKey(module, action);
    setMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetToRoleDefaults = () => {
    const next: Record<string, boolean> = {};
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        const key = permissionKey(module, action);
        next[key] = roleDefaults.has(key);
      }
    }
    setMatrix(next);
    toast.success('Permissions reset to role defaults');
  };

  const buildOverrides = () => {
    const overrides: { module: string; action: string; granted: boolean }[] = [];
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        const key = permissionKey(module, action);
        const current = !!matrix[key];
        const def = roleDefaults.has(key);
        if (current !== def) {
          overrides.push({ module, action, granted: current });
        }
      }
    }
    return overrides;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const resolvedSchoolId = schoolId || sessionSchoolId;
      if (!resolvedSchoolId) {
        throw new Error('Please select a school');
      }
      if (!userId && password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const payload: Record<string, unknown> = {
        name,
        email,
        username: username || null,
        phone,
        schoolId: resolvedSchoolId,
        role,
        suspended: !active,
        campusIds,
        permissionOverrides: buildOverrides(),
      };
      if (password) payload.password = password;

      const res = await fetch(userId ? `/api/users/${userId}` : '/api/users', {
        method: userId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const message =
          json.error ||
          (Array.isArray(json.errors) ? json.errors[0]?.message : null) ||
          'Failed to save user';
        throw new Error(message);
      }

      toast.success(userId ? 'User updated' : 'User created');
      router.push('/users');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>1. User Account</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="optional login name"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>{userId ? 'New Password (optional)' : 'Password'}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!userId}
            />
          </div>
          <div>
            <Label>School</Label>
            <Select
              value={schoolId || undefined}
              onValueChange={setSchoolId}
              disabled={
                schoolsLoading ||
                (session?.user?.role !== 'SUPER_ADMIN' && !!sessionSchoolId)
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={schoolsLoading ? 'Loading schools...' : 'Select school'}
                />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!schoolsLoading && schools.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No schools available.</p>
            )}
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={active} onCheckedChange={setActive} id="active" />
            <Label htmlFor="active">Account Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Campus Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {campusesForSchool.length === 0 ? (
            <p className="text-sm text-slate-500">No campuses for this school.</p>
          ) : (
            campusesForSchool.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
              >
                <Checkbox
                  checked={campusIds.includes(c.id)}
                  onCheckedChange={() => toggleCampus(c.id)}
                />
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {campusIds.includes(c.id) ? 'Allowed' : 'Blocked'}
                </span>
              </label>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>3. Role & Permissions</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={resetToRoleDefaults}>
            Reset to role defaults
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Module</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="py-2 px-2 text-center font-medium">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((module) => (
                <tr key={module} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{module}</td>
                  {ACTIONS.map((action) => {
                    const key = permissionKey(module, action);
                    const checked = !!matrix[key];
                    const isDefault = roleDefaults.has(key);
                    return (
                      <td key={action} className="py-2 px-2 text-center">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePerm(module, action)}
                        />
                        {checked !== isDefault && (
                          <span className="block text-[10px] text-amber-600">override</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || schoolsLoading}>
          {isSubmitting ? 'Saving...' : userId ? 'Update User' : 'Create User'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/users')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
