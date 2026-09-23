'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Phone,
  MoreVertical,
  FileUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetch('/api/class-groups')
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

  const hasFilters = !!(classGroupId || classId || sectionId);

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
        if (Array.isArray(payload)) {
          setStudents(payload);
          setTotal(payload.length);
        } else {
          setStudents(Array.isArray(payload.data) ? payload.data : []);
          setTotal(Number(payload.total) || 0);
        }
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
  }, [page, debouncedSearch, classGroupId, classId, sectionId]);

  const clearFilters = () => {
    setClassGroupId('');
    setClassId('');
    setSectionId('');
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
        <div className="flex gap-3">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

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
