'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Briefcase, GraduationCap, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStaff = () => {
    setLoading(true);
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = (Array.isArray(staff) ? staff : []).filter((s) =>
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.designation?.toLowerCase().includes(search.toLowerCase())
  );

  const teacherCount = staff.filter((s) => s.user?.role === 'TEACHER').length;

  return (
    <div className="page-content mx-auto w-full max-w-[1600px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Staff Management</h1>
          <p className="mt-1 text-muted-foreground">Manage teachers, admins, and support staff.</p>
        </div>
        <Link href="/staff/new">
          <Button className="cursor-pointer gap-2 font-semibold shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </Link>
      </div>

      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured flex flex-col justify-between p-5">
          <div className="w-fit rounded-xl bg-white/15 p-2.5">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-teal-100">Total Staff</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-white">{staff.length}</h3>
          </div>
        </div>
        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="w-fit rounded-xl bg-secondary p-2.5 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Teachers</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{teacherCount}</h3>
          </div>
        </div>
        <div className="bento-tile col-span-1 flex items-center p-4 sm:col-span-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or designation..."
              className="h-11 rounded-xl border-transparent bg-muted/60 pl-10 focus:border-primary/30 focus:bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bento-tile flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading staff...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bento-tile py-16 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>{search ? 'No staff match your search.' : 'No staff members yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => {
            const assignments = member.assignments || [];
            const sectionsIncharged = member.sectionsIncharged || [];
            return (
              <div key={member.id} className="bento-tile flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-foreground">{member.user?.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.designation || '—'}</p>
                    </div>
                  </div>
                  <Badge variant={member.user?.role === 'TEACHER' ? 'default' : 'secondary'}>
                    {member.user?.role || 'STAFF'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>
                      {member.department || 'General'} · {(member.employmentType || 'FULL_TIME').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>{member.qualification || '—'}</span>
                  </div>
                </div>

                {assignments.length > 0 && (
                  <div className="rounded-xl bg-muted/50 p-3 text-xs">
                    <p className="mb-1.5 font-semibold uppercase tracking-wide text-muted-foreground">Teaches</p>
                    <div className="flex flex-wrap gap-1">
                      {assignments.slice(0, 3).map((a: any) => (
                        <span key={a.id} className="rounded-lg border border-border/70 bg-card px-2 py-1 text-foreground">
                          {a.subject?.name} ({a.myClass?.name})
                        </span>
                      ))}
                      {assignments.length > 3 && (
                        <span className="px-2 py-1 text-muted-foreground">+{assignments.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {sectionsIncharged.length > 0 && (
                  <Badge variant="outline" className="w-fit border-primary/30 bg-secondary text-primary">
                    Class Teacher: {sectionsIncharged[0].myClass?.name}-{sectionsIncharged[0].name}
                  </Badge>
                )}

                <div className="mt-auto flex justify-end gap-2 pt-2">
                  <Link href={`/staff/${member.user?.id}`}>
                    <Button variant="outline" size="sm" className="cursor-pointer">Edit</Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer"
                    onClick={async () => {
                      if (!member.user?.id) {
                        toast.error('Invalid staff member');
                        return;
                      }
                      if (!confirm('Soft delete this staff member?')) return;
                      const res = await fetch(`/api/staff/${member.user.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        toast.success('Staff member removed');
                        fetchStaff();
                      } else {
                        toast.error('Failed to delete staff');
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
