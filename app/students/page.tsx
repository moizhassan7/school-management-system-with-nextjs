'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Phone,
  MoreVertical,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  useEffect(() => {
    const q = search.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setStudents([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/students?q=${encodeURIComponent(q)}`)
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
  }, [search]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Student Directory
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-base font-normal">
            Search by student ID, name, father name, or roll number.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50 gap-2 font-bold"
          >
            <FileUp className="h-4 w-4" /> Import
          </Button>
          <Link href="/students/new">
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-blue-500/20 font-bold gap-2">
              <Plus className="h-4 w-4" /> Add New Student
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <Input
            placeholder="Search by ID, Name, Father name, or Roll number..."
            className="pl-10 h-12 bg-[#f6f7f8] border-transparent focus:bg-white transition-all text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-2 text-sm text-slate-500">Searching...</p>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-20 text-slate-500 space-y-2">
            <Search className="h-10 w-10 mx-auto text-slate-300" />
            <p className="font-medium text-slate-700">Find a student</p>
            <p className="text-sm">
              Type at least 2 characters — ID, name, father name, or roll number.
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No students found matching &ldquo;{search.trim()}&rdquo;.
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
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
