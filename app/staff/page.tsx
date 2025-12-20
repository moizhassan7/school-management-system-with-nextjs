'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, User, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchStaff = () => {
    fetch('/api/staff').then(res => res.json()).then(setStaff);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter(s => 
    s.user.name.toLowerCase().includes(search.toLowerCase()) ||
    s.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">Manage teachers, admins, and support staff.</p>
        </div>
        <Link href="/staff/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Add Staff</Button>
        </Link>
      </div>

      {/* Search & List */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search staff..." 
            className="pl-10" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {member.user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{member.user.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.designation}</p>
                  </div>
                </div>
                <Badge variant={member.user.role === 'TEACHER' ? 'default' : 'secondary'}>
                  {member.user.role}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>{member.department || 'General'} • {member.employmentType.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span>{member.qualification || 'N/A'}</span>
                </div>
              </div>

              {/* Assignments Preview */}
              {member.assignments.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-md text-xs space-y-1">
                  <p className="font-semibold text-slate-500 uppercase">Teaches</p>
                  <div className="flex flex-wrap gap-1">
                    {member.assignments.slice(0, 3).map((a: any) => (
                      <span key={a.id} className="px-2 py-1 bg-white border rounded">
                        {a.subject.name} ({a.myClass.name})
                      </span>
                    ))}
                    {member.assignments.length > 3 && <span className="px-2 py-1 text-muted-foreground">+{member.assignments.length - 3} more</span>}
                  </div>
                </div>
              )}
              
              {/* Incharge Badge */}
              {member.sectionsIncharged.length > 0 && (
                <div className="mt-1">
                   <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                      Class Teacher: {member.sectionsIncharged[0].myClass.name}-{member.sectionsIncharged[0].name}
                   </Badge>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Link href={`/staff/${member.user.id}`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!member.user.id) return alert('Invalid staff member');
                    if (!confirm('Soft delete this staff member?')) return;
                    const res = await fetch(`/api/staff/${member.user.id}`, { method: 'DELETE' });
                    if (res.ok) fetchStaff();
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
