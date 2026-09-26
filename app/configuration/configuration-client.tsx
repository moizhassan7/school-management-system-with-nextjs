'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Building2, School, Layers, BookOpen, Grid3X3, Library, BookMarked } from 'lucide-react';
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
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';

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
  logoPath?: string | null;
  isActive: boolean;
  campuses: Campus[];
};

type SubjectGroupRow = {
  id: string;
  name: string;
  description?: string | null;
  classGroupId: string;
  classGroup: {
    id: string;
    name: string;
    campus: {
      id: string;
      name: string;
      school?: { id: string; initials: string; name: string } | null;
    };
  };
  subjects: { id: string; name: string }[];
};

type SubjectRow = {
  id: string;
  name: string;
  code?: string | null;
  subjectGroup?: { id: string; name: string } | null;
};

type ConfigEntity = 'school' | 'campus' | 'classGroup' | 'class' | 'section' | 'subjectGroup' | 'subject';

const VALID_TABS = new Set([
  'schools',
  'campuses',
  'groups',
  'classes',
  'sections',
  'subjects',
  'subject-groups',
]);

export default function ConfigurationClient() {
  const searchParams = useSearchParams();
  const { refreshBrand } = useSchoolBrand();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const initialTab = searchParams.get('tab') || 'schools';
  const [tab, setTab] = useState(VALID_TABS.has(initialTab) ? initialTab : 'schools');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [entity, setEntity] = useState<ConfigEntity>('school');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [parentIds, setParentIds] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetLogoState = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be less than 5MB');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolsRes, groupsRes, subjectsRes] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/subject-groups'),
        fetch('/api/subjects'),
      ]);
      const schoolsData = await schoolsRes.json();
      const groupsData = groupsRes.ok ? await groupsRes.json() : [];
      const subjectsData = subjectsRes.ok ? await subjectsRes.json() : [];
      if (!schoolsRes.ok) throw new Error(schoolsData.error || 'Failed to load');
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setSubjectGroups(Array.isArray(groupsData) ? groupsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load configuration');
      setSchools([]);
      setSubjectGroups([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && VALID_TABS.has(t)) setTab(t);
  }, [searchParams]);

  const q = search.trim().toLowerCase();

  const schoolRows = useMemo(
    () =>
      schools.filter(
        (s) => !q || s.name.toLowerCase().includes(q) || s.initials.toLowerCase().includes(q)
      ),
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

  const subjectGroupRows = useMemo(() => {
    return subjectGroups.filter((g) => {
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.classGroup?.name?.toLowerCase().includes(q) ||
        g.classGroup?.campus?.name?.toLowerCase().includes(q) ||
        g.classGroup?.campus?.school?.name?.toLowerCase().includes(q)
      );
    });
  }, [subjectGroups, q]);

  const subjectRows = useMemo(() => {
    return subjects.filter((subject) => {
      if (!q) return true;
      return (
        subject.name.toLowerCase().includes(q) ||
        subject.code?.toLowerCase().includes(q) ||
        subject.subjectGroup?.name?.toLowerCase().includes(q)
      );
    });
  }, [subjects, q]);

  const deleteSubject = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? It will be removed from staff assignments.`)) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete subject');
      toast.success('Subject deleted');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete subject');
    }
  };

  const openCreate = (type: ConfigEntity) => {
    setEntity(type);
    setDialogMode('create');
    setEditingId(null);
    setForm({});
    setParentIds({});
    resetLogoState();
    setDialogOpen(true);
  };

  const openEdit = (
    type: ConfigEntity,
    id: string,
    data: Record<string, string>,
    parents: Record<string, string> = {}
  ) => {
    setEntity(type);
    setDialogMode('edit');
    setEditingId(id);
    setForm(data);
    setParentIds(parents);
    setLogoFile(null);
    setLogoPreview(data.logoPath || null);
    setDialogOpen(true);
  };

  const toggleActive = async (
    type: ConfigEntity,
    id: string,
    isActive: boolean,
    extra?: Record<string, string>
  ) => {
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
      setSaving(true);
      let res: Response;
      if (entity === 'school') {
        let logoPath = form.logoPath || undefined;
        if (logoFile) {
          const uploadForm = new FormData();
          uploadForm.append('file', logoFile);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadForm,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) {
            throw new Error(uploadData.error || 'Failed to upload logo');
          }
          logoPath = uploadData.path;
        }

        const payload = {
          name: form.name,
          initials: form.initials,
          address: form.address,
          email: form.email,
          phone: form.phone,
          ...(logoPath ? { logoPath } : {}),
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
      } else if (entity === 'subject') {
        const payload = { name: form.name, code: form.code || '' };
        res = await fetch(dialogMode === 'create' ? '/api/subjects' : `/api/subjects/${editingId}`, {
          method: dialogMode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (entity === 'subjectGroup') {
        res = await fetch('/api/subject-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description || '',
            classGroupId: parentIds.classGroupId,
          }),
        });
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
      resetLogoState();
      if (entity === 'school') {
        await refreshBrand();
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
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
      <span className="text-xs text-muted-foreground">{active ? 'Active' : 'Inactive'}</span>
    </div>
  );

  const entityLabel =
    entity === 'classGroup'
      ? 'Class Group'
      : entity === 'subjectGroup'
        ? 'Subject Group'
        : entity.charAt(0).toUpperCase() + entity.slice(1);

  const selectedSchool = schools.find((s) => s.id === parentIds.schoolId);
  const campusesForSchool = selectedSchool?.campuses || [];
  const selectedCampus = campusesForSchool.find((c) => c.id === parentIds.campusId);
  const classGroupsForCampus = selectedCampus?.classGroups || [];

  return (
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Configuration
        </h1>
        <p className="mt-1 text-muted-foreground">
          Master setup for schools, campuses, classes, sections, and subjects.
        </p>
      </div>

      <div className="bento-tile relative max-w-md p-3">
        <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="rounded-xl border-transparent bg-muted/60 pl-10 focus:border-primary/30 focus:bg-card"
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="schools" className="cursor-pointer gap-1 rounded-lg">
            <School className="h-4 w-4" /> Schools
          </TabsTrigger>
          <TabsTrigger value="campuses" className="cursor-pointer gap-1 rounded-lg">
            <Building2 className="h-4 w-4" /> Campuses
          </TabsTrigger>
          <TabsTrigger value="groups" className="cursor-pointer gap-1 rounded-lg">
            <Layers className="h-4 w-4" /> Class Groups
          </TabsTrigger>
          <TabsTrigger value="classes" className="cursor-pointer gap-1 rounded-lg">
            <BookOpen className="h-4 w-4" /> Classes
          </TabsTrigger>
          <TabsTrigger value="sections" className="cursor-pointer gap-1 rounded-lg">
            <Grid3X3 className="h-4 w-4" /> Sections
          </TabsTrigger>
          <TabsTrigger value="subjects" className="cursor-pointer gap-1 rounded-lg">
            <BookMarked className="h-4 w-4" /> Subjects
          </TabsTrigger>
          <TabsTrigger value="subject-groups" className="cursor-pointer gap-1 rounded-lg">
            <Library className="h-4 w-4" /> Subject Groups
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="bento-tile py-20 text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            <TabsContent value="schools" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('school')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add School
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
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
                        <TableCell className="text-sm text-slate-600">
                          {s.email}
                          <br />
                          {s.phone}
                        </TableCell>
                        <TableCell>{s.campuses.length}</TableCell>
                        <TableCell>
                          <ActiveCell
                            active={s.isActive !== false}
                            onChange={(v) => toggleActive('school', s.id, v)}
                          />
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
                                logoPath: s.logoPath || '',
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
                <Button onClick={() => openCreate('campus')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Campus
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
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
                            onChange={(v) =>
                              toggleActive('campus', c.id, v, { schoolId: c.schoolId })
                            }
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
                                {
                                  name: c.name,
                                  address: c.address,
                                  phone: c.phone,
                                  email: c.email || '',
                                },
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
                <Button onClick={() => openCreate('classGroup')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Class Group
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
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
                            onChange={(v) =>
                              toggleActive('classGroup', g.id, v, { campusId: g.campusId })
                            }
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
                <Button onClick={() => openCreate('class')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Class
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
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
                              openEdit(
                                'class',
                                cl.id,
                                { name: cl.name },
                                { classGroupId: cl.classGroupId }
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

            <TabsContent value="sections" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('section')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Section
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
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
                            onChange={(v) =>
                              toggleActive('section', sec.id, v, { classId: sec.classId })
                            }
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

            <TabsContent value="subjects" className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Define subjects here, then assign them to staff from the staff form.
                </p>
                <Button onClick={() => openCreate('subject')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Subject
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
                {subjectRows.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    No subjects yet. Add English, Mathematics, or any subject your staff will teach.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Subject Group</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectRows.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell>{subject.code || '—'}</TableCell>
                          <TableCell>{subject.subjectGroup?.name || '—'}</TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openEdit('subject', subject.id, {
                                  name: subject.name,
                                  code: subject.code || '',
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSubject(subject.id, subject.name)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="subject-groups" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate('subjectGroup')} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Subject Group
                </Button>
              </div>
              <div className="bento-tile overflow-hidden">
                {subjectGroupRows.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    No subject groups yet. Create one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Class Group</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectGroupRows.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell>{g.classGroup?.name}</TableCell>
                          <TableCell>{g.classGroup?.campus?.name}</TableCell>
                          <TableCell>
                            {g.classGroup?.campus?.school?.initials ||
                              g.classGroup?.campus?.school?.name ||
                              '-'}
                          </TableCell>
                          <TableCell>{g.subjects?.length || 0}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/subject-groups/${g.id}`}>Manage</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetLogoState();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Add' : 'Edit'} {entityLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {entity === 'school' && (
              <>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Initials</Label>
                  <Input
                    value={form.initials || ''}
                    onChange={(e) => setForm({ ...form, initials: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-logo">School Logo</Label>
                  <Input
                    id="school-logo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or WebP. Max 5MB.
                  </p>
                  {logoPreview && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <img
                        src={logoPreview}
                        alt="School logo preview"
                        className="h-16 w-16 rounded-lg object-contain bg-card p-1"
                      />
                      <div className="text-sm text-muted-foreground">
                        {logoFile ? 'New logo selected' : 'Current logo'}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {entity === 'campus' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>School</Label>
                    <Select
                      value={parentIds.schoolId || ''}
                      onValueChange={(v) => setParentIds({ schoolId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </>
            )}
            {entity === 'classGroup' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>Campus</Label>
                    <Select
                      value={parentIds.campusId || ''}
                      onValueChange={(v) => setParentIds({ campusId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select campus" />
                      </SelectTrigger>
                      <SelectContent>
                        {campusRows.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.schoolName} — {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </>
            )}
            {entity === 'class' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>Class Group</Label>
                    <Select
                      value={parentIds.classGroupId || ''}
                      onValueChange={(v) => setParentIds({ classGroupId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {classGroupRows.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.campusName} — {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </>
            )}
            {entity === 'section' && (
              <>
                {dialogMode === 'create' && (
                  <div>
                    <Label>Class</Label>
                    <Select
                      value={parentIds.classId || ''}
                      onValueChange={(v) => setParentIds({ classId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classRows.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.groupName} — {cl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </>
            )}
            {entity === 'subject' && (
              <>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input
                    value={form.code || ''}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Optional, e.g. MATH"
                  />
                </div>
              </>
            )}
            {entity === 'subjectGroup' && (
              <>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Pre-Medical"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>School</Label>
                  <Select
                    value={parentIds.schoolId || ''}
                    onValueChange={(v) =>
                      setParentIds({ schoolId: v, campusId: '', classGroupId: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Campus</Label>
                  <Select
                    value={parentIds.campusId || ''}
                    disabled={!parentIds.schoolId}
                    onValueChange={(v) =>
                      setParentIds({
                        schoolId: parentIds.schoolId,
                        campusId: v,
                        classGroupId: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campusesForSchool.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Class Group</Label>
                  <Select
                    value={parentIds.classGroupId || ''}
                    disabled={!parentIds.campusId}
                    onValueChange={(v) =>
                      setParentIds({
                        schoolId: parentIds.schoolId,
                        campusId: parentIds.campusId,
                        classGroupId: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class group" />
                    </SelectTrigger>
                    <SelectContent>
                      {classGroupsForCampus.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
