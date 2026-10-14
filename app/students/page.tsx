'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Phone,
  MoreVertical,
  FileUp,
  FileSpreadsheet,
  Trash2,
  X,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { can } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListPagination } from '@/components/list-pagination';
import { EmptyState } from '@/components/empty-state';

type ClassGroupOption = {
  id: string;
  name: string;
  classes: {
    id: string;
    name: string;
    sections: { id: string; name: string }[];
  }[];
};

type PromoteMode = 'CLASS' | 'INDIVIDUAL';
type FeeMode = 'KEEP_EXISTING' | 'SWITCH_TO_CLASS_DEFAULT';

type StudentOption = {
  id: string;
  name: string;
  email?: string | null;
  studentRecord?: {
    admissionNumber?: string | null;
    rollNumber?: string | null;
  } | null;
};

const ALL_SECTIONS = '__all_sections__';
const NO_SECTION = '__no_section__';

function fatherNameOf(student: any): string {
  const parents = student.studentRecord?.parents || [];
  const father = parents.find((p: any) => p.relationship === 'FATHER');
  return (
    father?.parentRecord?.user?.name ||
    parents[0]?.parentRecord?.user?.name ||
    '—'
  );
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const canDelete = can(session?.user, 'STUDENTS', 'DELETE');
  const canPromote = can(session?.user, 'STUDENTS', 'EDIT');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const abortRef = useRef<AbortController | null>(null);

  const [classGroups, setClassGroups] = useState<ClassGroupOption[]>([]);
  const [classGroupId, setClassGroupId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteMode, setPromoteMode] = useState<PromoteMode>('CLASS');
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [loadingStudentOptions, setLoadingStudentOptions] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [feeMode, setFeeMode] = useState<FeeMode>('KEEP_EXISTING');

  useEffect(() => {
    fetch('/api/class-groups?view=options')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClassGroups(data);
      })
      .catch((err) => console.error('Failed to load class groups', err));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classGroupId, classId, sectionId]);

  const availableClasses = useMemo(() => {
    if (!classGroupId) return [];
    return (
      classGroups.find((g) => g.id === classGroupId)?.classes || []
    )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classGroups, classGroupId]);

  const availableSections = useMemo(() => {
    if (!classId) return [];
    return (
      availableClasses.find((c) => c.id === classId)?.sections || []
    )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableClasses, classId]);

  const sourceClasses = useMemo(() => {
    if (!sourceGroupId) return [];
    return (classGroups.find((g) => g.id === sourceGroupId)?.classes || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classGroups, sourceGroupId]);

  const sourceSections = useMemo(() => {
    if (!sourceClassId) return [];
    return (sourceClasses.find((c) => c.id === sourceClassId)?.sections || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceClasses, sourceClassId]);

  const targetClasses = useMemo(() => {
    if (!targetGroupId) return [];
    return (classGroups.find((g) => g.id === targetGroupId)?.classes || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classGroups, targetGroupId]);

  const targetSections = useMemo(() => {
    if (!targetClassId) return [];
    return (targetClasses.find((c) => c.id === targetClassId)?.sections || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [targetClasses, targetClassId]);

  const hasFilters = !!(classGroupId || classId || sectionId);
  const promoteDisabled =
    promoting ||
    !sourceClassId ||
    !targetClassId ||
    (promoteMode === 'INDIVIDUAL' && !selectedStudentId);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (classGroupId) params.set('classGroupId', classGroupId);
    if (classId) params.set('classId', classId);
    if (sectionId) params.set('sectionId', sectionId);

    fetch(`/api/students?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => {
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.data)
            ? payload.data
            : [];
        rows.sort((a: { name?: string }, b: { name?: string }) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
        );
        setStudents(rows);
        setTotal(Array.isArray(payload) ? rows.length : Number(payload.total) || 0);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error(err);
        setStudents([]);
        setTotal(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, debouncedSearch, classGroupId, classId, sectionId, refreshKey]);

  useEffect(() => {
    if (!promoteOpen || promoteMode !== 'INDIVIDUAL' || !sourceClassId) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      all: '1',
      classId: sourceClassId,
    });
    if (sourceSectionId) params.set('sectionId', sourceSectionId);

    setLoadingStudentOptions(true);
    fetch(`/api/students?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => {
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        setStudentOptions(rows);
        setSelectedStudentId((current) =>
          rows.some((student: StudentOption) => student.id === current) ? current : ''
        );
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error(err);
        setStudentOptions([]);
        setSelectedStudentId('');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStudentOptions(false);
      });

    return () => controller.abort();
  }, [promoteOpen, promoteMode, sourceClassId, sourceSectionId]);

  const clearFilters = () => {
    setClassGroupId('');
    setClassId('');
    setSectionId('');
  };

  const resetPromotionForm = () => {
    setPromoteMode('CLASS');
    setSourceGroupId('');
    setSourceClassId('');
    setSourceSectionId('');
    setTargetGroupId('');
    setTargetClassId('');
    setTargetSectionId('');
    setSelectedStudentId('');
    setStudentOptions([]);
    setFeeMode('KEEP_EXISTING');
  };

  const submitPromotion = async () => {
    setPromoting(true);
    try {
      const res = await fetch('/api/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: promoteMode,
          sourceClassId,
          sourceSectionId: sourceSectionId || null,
          targetClassId,
          targetSectionId: targetSectionId || null,
          studentIds: promoteMode === 'INDIVIDUAL' ? [selectedStudentId] : undefined,
          feeMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to promote students');
      }

      toast.success(data.message || 'Students promoted');
      setPromoteOpen(false);
      resetPromotionForm();
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete student');
      }
      toast.success(`${pendingDelete.name} was removed`);
      setStudents((current) => current.filter((student) => student.id !== pendingDelete.id));
      setTotal((current) => Math.max(0, current - 1));
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Student Directory
          </h1>
          <p className="text-base text-muted-foreground">
            Search by student ID, name, father name, or roll number — or filter by class.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {canPromote && (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setPromoteOpen(true)}
            >
              <GraduationCap className="h-4 w-4" /> Promote
            </Button>
          )}
          <Link href="/reports">
            <Button variant="outline" className="cursor-pointer gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5">
              <FileSpreadsheet className="h-4 w-4" /> Class Reports
            </Button>
          </Link>
          <Button variant="outline" className="cursor-pointer gap-2 font-semibold">
            <FileUp className="h-4 w-4" /> Import
          </Button>
          <Link href="/students/new">
            <Button className="cursor-pointer gap-2 font-semibold shadow-md shadow-primary/20">
              <Plus className="h-4 w-4" /> Add New Student
            </Button>
          </Link>
        </div>
      </div>

      <Dialog
        open={promoteOpen}
        onOpenChange={(open) => {
          if (promoting) return;
          setPromoteOpen(open);
          if (!open) resetPromotionForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Promote Students</DialogTitle>
            <DialogDescription>
              Move a full class or one student to another class in the same school.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <Button
                type="button"
                variant={promoteMode === 'CLASS' ? 'default' : 'ghost'}
                className="h-10"
                onClick={() => {
                  setPromoteMode('CLASS');
                  setSelectedStudentId('');
                }}
              >
                Full class
              </Button>
              <Button
                type="button"
                variant={promoteMode === 'INDIVIDUAL' ? 'default' : 'ghost'}
                className="h-10"
                onClick={() => setPromoteMode('INDIVIDUAL')}
              >
                Individual
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">From</h3>
                <Select
                  value={sourceGroupId || undefined}
                  onValueChange={(value) => {
                    setSourceGroupId(value);
                    setSourceClassId('');
                    setSourceSectionId('');
                    setSelectedStudentId('');
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Source class group" />
                  </SelectTrigger>
                  <SelectContent>
                    {classGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sourceClassId || undefined}
                  onValueChange={(value) => {
                    setSourceClassId(value);
                    setSourceSectionId('');
                    setSelectedStudentId('');
                  }}
                  disabled={!sourceGroupId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={sourceGroupId ? 'Source class' : 'Select group first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sourceSectionId || ALL_SECTIONS}
                  onValueChange={(value) => {
                    setSourceSectionId(value === ALL_SECTIONS ? '' : value);
                    setSelectedStudentId('');
                  }}
                  disabled={!sourceClassId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SECTIONS}>All sections</SelectItem>
                    {sourceSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {promoteMode === 'INDIVIDUAL' && (
                  <Select
                    value={selectedStudentId || undefined}
                    onValueChange={setSelectedStudentId}
                    disabled={!sourceClassId || loadingStudentOptions || studentOptions.length === 0}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue
                        placeholder={
                          loadingStudentOptions
                            ? 'Loading students...'
                            : sourceClassId
                              ? 'Select student'
                              : 'Select source class first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {studentOptions.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                          {student.studentRecord?.rollNumber
                            ? ` - Roll ${student.studentRecord.rollNumber}`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">To</h3>
                <Select
                  value={targetGroupId || undefined}
                  onValueChange={(value) => {
                    setTargetGroupId(value);
                    setTargetClassId('');
                    setTargetSectionId('');
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Target class group" />
                  </SelectTrigger>
                  <SelectContent>
                    {classGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={targetClassId || undefined}
                  onValueChange={(value) => {
                    setTargetClassId(value);
                    setTargetSectionId('');
                  }}
                  disabled={!targetGroupId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={targetGroupId ? 'Target class' : 'Select group first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {targetClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={targetSectionId || NO_SECTION}
                  onValueChange={(value) => setTargetSectionId(value === NO_SECTION ? '' : value)}
                  disabled={!targetClassId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="No section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SECTION}>No section</SelectItem>
                    {targetSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Fee structure</h3>
              <Select value={feeMode} onValueChange={(value) => setFeeMode(value as FeeMode)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEEP_EXISTING">Keep existing student fee structures</SelectItem>
                  <SelectItem value="SWITCH_TO_CLASS_DEFAULT">Replace with target class default fees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={promoting}
              onClick={() => setPromoteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={promoteDisabled} onClick={submitPromotion}>
              {promoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bento-tile space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            value={classGroupId || undefined}
            onValueChange={(value) => {
              setClassGroupId(value);
              setClassId('');
              setSectionId('');
            }}
          >
            <SelectTrigger className="h-11 w-full border-transparent bg-muted/60">
              <SelectValue placeholder="Class group" />
            </SelectTrigger>
            <SelectContent>
              {classGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={classId || undefined}
            onValueChange={(value) => {
              setClassId(value);
              setSectionId('');
            }}
            disabled={!classGroupId}
          >
            <SelectTrigger className="h-11 w-full border-transparent bg-muted/60">
              <SelectValue placeholder={classGroupId ? 'Class' : 'Select group first'} />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sectionId || undefined}
            onValueChange={setSectionId}
            disabled={!classId}
          >
            <SelectTrigger className="h-11 w-full border-transparent bg-muted/60">
              <SelectValue placeholder={classId ? 'Section' : 'Select class first'} />
            </SelectTrigger>
            <SelectContent>
              {availableSections.map((sec) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <Input
              placeholder="Search by ID, Name, Father name, or Roll number..."
              className="h-12 border-transparent bg-muted/60 pl-10 text-base transition-all focus:border-primary/30 focus:bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-12 shrink-0 gap-1.5 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="bento-tile overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading students…</p>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            className="border-0"
            title={
              debouncedSearch || hasFilters
                ? 'No students match your filters'
                : 'No students found'
            }
            description={
              debouncedSearch || hasFilters
                ? 'Try clearing search or filters.'
                : 'Add your first student to get started.'
            }
            actionLabel={debouncedSearch || hasFilters ? undefined : 'Add New Student'}
            actionHref={debouncedSearch || hasFilters ? undefined : '/students/new'}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  <TableHead className="p-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Student
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Father
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Admission No
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Roll No
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Class
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Status
                  </TableHead>
                  <TableHead className="hidden p-4 text-xs font-bold tracking-wider text-slate-500 uppercase sm:table-cell">
                    Contact
                  </TableHead>
                  <TableHead className="p-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const record = student.studentRecord;
                  return (
                    <TableRow
                      key={student.id}
                      className="group border-0 transition-colors hover:bg-gray-50"
                    >
                      <TableCell className="p-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 transition-colors group-hover:text-primary">
                              {student.name}
                            </span>
                            <span className="text-xs text-slate-500">{student.email}</span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="p-4 text-sm text-slate-700">
                        {fatherNameOf(student)}
                      </TableCell>
                      <TableCell className="p-4 font-mono text-sm font-medium text-slate-900">
                        {record?.admissionNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 font-mono text-sm font-medium text-slate-900">
                        {record?.rollNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-sm text-slate-600">
                        {record?.myClass
                          ? `${record.myClass.name}${
                              record.section ? ` (${record.section.name})` : ''
                            }`
                          : '—'}
                      </TableCell>
                      <TableCell className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            student.suspended
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              student.suspended ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          />
                          {student.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden p-4 text-sm text-slate-500 sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {student.phone || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Delete ${student.name}`}
                              onClick={() => setPendingDelete({ id: student.id, name: student.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/students/${student.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:bg-gray-100 hover:text-primary"
                              aria-label={`Open ${student.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the student from directories, classes, attendance, and exam lists. Fee history stays on record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
              >
                {deleting ? 'Deleting…' : 'Delete student'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="px-4 pb-4">
          <ListPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
