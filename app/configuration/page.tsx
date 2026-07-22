'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Building2, School, Layers, BookOpen, Grid3X3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Section = { id: string; name: string; isActive: boolean; classId: string };
type ClassItem = {
  id: string;
  name: string;
  isActive: boolean;
  classGroupId: string;
  sections: Section[];
};
type ClassGroup = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  campusId: string;
  classes: ClassItem[];
};
type Campus = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string | null;
  isActive: boolean;
  schoolId: string;
  classGroups: ClassGroup[];
};
type SchoolRow = {
  id: string;
  name: string;
  initials: string;
  address: string;
  email: string;
  phone: string;
  isActive: boolean;
  campuses: Campus[];
};

export default function ConfigurationPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('schools');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [entity, setEntity] = useState<'school' | 'campus' | 'classGroup' | 'class' | 'section'>('school');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [parentIds, setParentIds] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setSchools(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load configuration');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();

  const schoolRows = useMemo(
    () => schools.filter((s) => !q || s.name.toLowerCase().includes(q) || s.initials.toLowerCase().includes(q)),
    [schools, q]
  );

  const campusRows = useMemo(() => {
    const rows: (Campus & { schoolName: string })[] = [];
    for (const s of schools) {
      for (const c of s.campuses) {
        if (!q || c.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) {
          rows.push({ ...c, schoolName: s.name });
        }
      }
    }
    return rows;
  }, [schools, q]);

  const classGroupRows = useMemo(() => {
    const rows: (ClassGroup & { campusName: string; schoolName: string })[] = [];
    for (const s of schools) {
      for (const c of s.campuses) {
        for (const g of c.classGroups) {
          if (!q || g.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) {
            rows.push({ ...g, campusName: c.name, schoolName: s.name });
          }
        }
      }
    }
    return rows;
  }, [schools, q]);

  const classRows = useMemo(() => {
    const rows: (ClassItem & { groupName: string; campusName: string })[] = [];
    for (const s of schools) {
      for (const c of s.campuses) {
        for (const g of c.classGroups) {
          for (const cl of g.classes) {
            if (!q || cl.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)) {
              rows.push({ ...cl, groupName: g.name, campusName: c.name });
            }
          }
        }
      }
    }
    return rows;
  }, [schools, q]);

  const sectionRows = useMemo(() => {
    const rows: (Section & { className: string; groupName: string })[] = [];
    for (const s of schools) {
      for (const c of s.campuses) {
        for (const g of c.classGroups) {
          for (const cl of g.classes) {
            for (const sec of cl.sections || []) {
              if (!q || sec.name.toLowerCase().includes(q) || cl.name.toLowerCase().includes(q)) {
                rows.push({ ...sec, className: cl.name, groupName: g.name });
              }
            }
          }
        }
      }
    }
    return rows;
  }, [schools, q]);

  const openCreate = (type: typeof entity) => {
    setEntity(type);
    setDialogMode('create');
    setEditingId(null);
    setForm({});
    setParentIds({});
    setDialogOpen(true);
  };

  const openEdit = (type: typeof entity, id: string, data: Record<string, string>, parents: Record<string, string> = {}) => {
    setEntity(type);
    setDialogMode('edit');
    setEditingId(id);
    setForm(data);
    setParentIds(parents);
    setDialogOpen(true);
  };

  const toggleActive = async (type: typeof entity, id: string, isActive: boolean, extra?: Record<string, string>) => {
    try {
      let url = '';
      if (type === 'school') url = `/api/schools/${id}`;
      if (type === 'campus') url = `/api/schools/${extra!.schoolId}/campuses/${id}`;
      if (type === 'classGroup') url = `/api/campuses/${extra!.campusId}/class-groups/${id}`;
      if (type === 'class') url = `/api/classes/${id}`;
      if (type === 'section') url = `/api/classes/${extra!.classId}/sections/${id}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }
      toast.success(isActive ? 'Activated' : 'Deactivated');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const save = async () => {
    try {
      let res: Response;
      if (entity === 'school') {
        const payload = {
          name: form.name,
          initials: form.initials,
          address: form.address,
          email: form.email,
          phone: form.phone,
        };
        res = await fetch(dialogMode === 'create' ? '/api/schools' : `/api/schools/${editingId}`, {
          method: dialogMode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (entity === 'campus') {
        const schoolId = parentIds.schoolId || form.schoolId;
        const payload = {
          name: form.name,
          address: form.address,
          phone: form.phone,
          email: form.email || '',
        };
        res = await fetch(
          dialogMode === 'create'
            ? `/api/schools/${schoolId}/campuses`
            : `/api/schools/${schoolId}/campuses/${editingId}`,
          {
            method: dialogMode === 'create' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      } else if (entity === 'classGroup') {
        const campusId = parentIds.campusId || form.campusId;
        const payload = { name: form.name, description: form.description || '' };
        res = await fetch(
          dialogMode === 'create'
            ? `/api/campuses/${campusId}/class-groups`
            : `/api/campuses/${campusId}/class-groups/${editingId}`,
          {
            method: dialogMode === 'create' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      } else if (entity === 'class') {
        const classGroupId = parentIds.classGroupId || form.classGroupId;
        if (dialogMode === 'create') {
          res = await fetch(`/api/class-groups/${classGroupId}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name }),
          });
        } else {
          res = await fetch(`/api/classes/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name }),
          });
        }
      } else {
        const classId = parentIds.classId || form.classId;
        if (dialogMode === 'create') {
          res = await fetch(`/api/classes/${classId}/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name }),
          });
        } else {
          res = await fetch(`/api/classes/${classId}/sections/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name }),
          });
        }
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(dialogMode === 'create' ? 'Created' : 'Updated');
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const ActiveCell = ({
    active,
    onChange,
  }: {
    active: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center gap-2">
      <Switch checked={active} onCheckedChange={onChange} />
      <span className="text-xs text-slate-500">{active ? 'Active' : 'Inactive'}</span>
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Configuration</h1>
        <p className="text-slate-500 mt-1">
          Master setup for schools, campuses, class groups, classes, and sections.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="schools" className="gap-1"><School className="h-4 w-4" /> Schools</TabsTrigger>
          <TabsTrigger value="campuses" className="gap-1"><Building2 className="h-4 w-4" /> Campuses</TabsTrigger>
          <TabsTrigger value="groups" className="gap-1"><Layers className="h-4 w-4" /> Class Groups</TabsTrigger>
          <TabsTrigger value="classes" className="gap-1"><BookOpen className="h-4 w-4" /> Classes</TabsTrigger>
          <TabsTrigger value="sections" className="gap-1"><Grid3X3 className="h-4 w-4" /> Sections</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading...</div>
        ) : (
          <>
            <TabsContent value="schools" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('school')} className="gap-2"><Plus className="h-4 w-4" /> Add School</Button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Initials</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Campuses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolRows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.initials}</TableCell>
                        <TableCell className="text-sm text-slate-600">{s.email}<br />{s.phone}</TableCell>
                        <TableCell>{s.campuses.length}</TableCell>
                        <TableCell>
                          <ActiveCell active={s.isActive !== false} onChange={(v) => toggleActive('school', s.id, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEdit('school', s.id, {
                                name: s.name,
                                initials: s.initials,
                                address: s.address,
                                email: s.email,
                                phone: s.phone,
                              })
                            }
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="campuses" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('campus')} className="gap-2"><Plus className="h-4 w-4" /> Add Campus</Button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campus</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campusRows.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.schoolName}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>
                          <ActiveCell
                            active={c.isActive !== false}
                            onChange={(v) => toggleActive('campus', c.id, v, { schoolId: c.schoolId })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEdit(
                                'campus',
                                c.id,
                                { name: c.name, address: c.address, phone: c.phone, email: c.email || '' },
                                { schoolId: c.schoolId }
                              )
                            }
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('classGroup')} className="gap-2"><Plus className="h-4 w-4" /> Add Class Group</Button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Campus</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classGroupRows.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.name}</TableCell>
                        <TableCell>{g.campusName}</TableCell>
                        <TableCell>{g.classes.length}</TableCell>
                        <TableCell>
                          <ActiveCell
                            active={g.isActive !== false}
                            onChange={(v) => toggleActive('classGroup', g.id, v, { campusId: g.campusId })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEdit(
                                'classGroup',
                                g.id,
                                { name: g.name, description: g.description || '' },
                                { campusId: g.campusId }
                              )
                            }
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="classes" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('class')} className="gap-2"><Plus className="h-4 w-4" /> Add Class</Button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classRows.map((cl) => (
                      <TableRow key={cl.id}>
                        <TableCell className="font-medium">{cl.name}</TableCell>
                        <TableCell>{cl.groupName}</TableCell>
                        <TableCell>{cl.sections?.length || 0}</TableCell>
                        <TableCell>
                          <ActiveCell
                            active={cl.isActive !== false}
                            onChange={(v) => toggleActive('class', cl.id, v)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEdit('class', cl.id, { name: cl.name }, { classGroupId: cl.classGroupId })
                            }
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="sections" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('section')} className="gap-2"><Plus className="h-4 w-4" /> Add Section</Button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionRows.map((sec) => (
                      <TableRow key={sec.id}>
                        <TableCell className="font-medium">{sec.name}</TableCell>
                        <TableCell>{sec.className}</TableCell>
                        <TableCell>{sec.groupName}</TableCell>
                        <TableCell>
                          <ActiveCell
                            active={sec.isActive !== false}
                            onChange={(v) => toggleActive('section', sec.id, v, { classId: sec.classId })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEdit('section', sec.id, { name: sec.name }, { classId: sec.classId })
                            }
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Add' : 'Edit'}{' '}
              {entity === 'classGroup' ? 'Class Group' : entity.charAt(0).toUpperCase() + entity.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {entity === 'school' && (
              <>
                <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Initials</Label><Input value={form.initials || ''} onChange={(e) => setForm({ ...form, initials: e.target.value })} /></div>
                <div><Label>Address</Label><Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </>
            )}
            {entity === 'campus' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>School</Label>
                    <Select value={parentIds.schoolId || ''} onValueChange={(v) => setParentIds({ schoolId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Address</Label><Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </>
            )}
            {entity === 'classGroup' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>Campus</Label>
                    <Select value={parentIds.campusId || ''} onValueChange={(v) => setParentIds({ campusId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                      <SelectContent>
                        {campusRows.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.schoolName} — {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </>
            )}
            {entity === 'class' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>Class Group</Label>
                    <Select value={parentIds.classGroupId || ''} onValueChange={(v) => setParentIds({ classGroupId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                      <SelectContent>
                        {classGroupRows.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.campusName} — {g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </>
            )}
            {entity === 'section' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>Class</Label>
                    <Select value={parentIds.classId || ''} onValueChange={(v) => setParentIds({ classId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classRows.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>{cl.groupName} — {cl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
