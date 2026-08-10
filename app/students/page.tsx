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
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const availableClasses = useMemo(() => {
    if (!classGroupId) return [];
    return (
      classGroups.find((g) => g.id === classGroupId)?.classes || []
    ).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [classGroups, classGroupId]);

  const availableSections = useMemo(() => {
    if (!classId) return [];
    return (
      availableClasses.find((c) => c.id === classId)?.sections || []
    ).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [availableClasses, classId]);

  const hasFilters = !!(classGroupId || classId || sectionId);
  const canQuery = search.trim().length >= 2 || hasFilters;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!canQuery) {
      setStudents([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      const q = search.trim();
      if (q.length >= 2) params.set('q', q);
      if (classGroupId) params.set('classGroupId', classGroupId);
      if (classId) params.set('classId', classId);
      if (sectionId) params.set('sectionId', sectionId);

      fetch(`/api/students?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setStudents(Array.isArray(data) ? data : []);
          setHasSearched(true);
        })
        .catch((err) => {
          console.error(err);
          setStudents([]);
          setHasSearched(true);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, classGroupId, classId, sectionId, canQuery]);

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
          <Button
            variant="outline"
            className="cursor-pointer gap-2 font-semibold"
          >
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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
            <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
          </div>
        ) : !hasSearched ? (
          <div className="space-y-2 py-20 text-center text-muted-foreground">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-slate-700">Find a student</p>
            <p className="text-sm">
              Filter by class group / class / section, or type at least 2 characters to search.
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No students found
            {search.trim().length >= 2
              ? <> matching &ldquo;{search.trim()}&rdquo;</>
              : null}
            {hasFilters ? ' with the selected filters' : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Student
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Father
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Admission No
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Roll No
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Class
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Contact
                  </TableHead>
                  <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
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
                      className="group hover:bg-gray-50 transition-colors border-0"
                    >
                      <TableCell className="p-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                              {student.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {student.email}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="p-4 text-sm text-slate-700">
                        {fatherNameOf(student)}
                      </TableCell>
                      <TableCell className="p-4 text-sm text-slate-900 font-medium font-mono">
                        {record?.admissionNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-sm text-slate-900 font-medium font-mono">
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
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
                      <TableCell className="p-4 text-sm text-slate-500 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {student.phone || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <Link href={`/students/${student.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-gray-100"
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

        {hasSearched && students.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-gray-50/50">
            <p className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-900">{students.length}</span>{' '}
              result{students.length === 1 ? '' : 's'}
              {students.length >= 200 ? ' (max 200)' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
