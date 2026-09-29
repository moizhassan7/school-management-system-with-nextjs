'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Users,
  UserCheck,
  Phone,
  RefreshCw,
  X,
  ChevronDown,
  Layers,
  GraduationCap,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ListPagination } from '@/components/list-pagination';
import { toast } from 'sonner';
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';
import {
  exportStudentsToExcel,
  exportStudentsToCsv,
  type StudentReportItem,
} from '@/lib/reports/student-export';
import PrintableStudentReport from '@/components/reports/printable-student-report';

interface ClassGroupOption {
  id: string;
  name: string;
  classes: {
    id: string;
    name: string;
    sections: { id: string; name: string }[];
  }[];
}

interface ReportStats {
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  otherStudents: number;
  activeStudents: number;
  suspendedStudents: number;
  withPhoneCount: number;
  withFatherInfoCount: number;
}

export default function ReportsPage() {
  const { brand } = useSchoolBrand();

  // Filter States
  const [classGroups, setClassGroups] = useState<ClassGroupOption[]>([]);
  const [classGroupId, setClassGroupId] = useState<string>('all');
  const [classId, setClassId] = useState<string>('all');
  const [sectionId, setSectionId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  // Data States
  const [students, setStudents] = useState<StudentReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [documentStudents, setDocumentStudents] = useState<StudentReportItem[]>([]);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [viewTab, setViewTab] = useState<'roster' | 'parents' | 'preview'>('roster');

  const abortRef = useRef<AbortController | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Load class options
  useEffect(() => {
    fetch('/api/reports/classes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load classes');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setClassGroups(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load class filter options:', err);
        // Fallback to /api/class-groups if reports/classes fails
        fetch('/api/class-groups')
          .then((r) => r.json())
          .then((fallbackData) => {
            if (Array.isArray(fallbackData)) setClassGroups(fallbackData);
          })
          .catch(() => {});
      });
  }, []);

  // Compute available classes based on selected classGroupId
  const availableClasses = useMemo(() => {
    if (classGroupId === 'all') {
      return classGroups.flatMap((g) => g.classes || []);
    }
    const group = classGroups.find((g) => g.id === classGroupId);
    return group?.classes || [];
  }, [classGroups, classGroupId]);

  // Compute available sections based on selected classId
  const availableSections = useMemo(() => {
    if (classId === 'all') return [];
    const cls = availableClasses.find((c) => c.id === classId);
    return cls?.sections || [];
  }, [availableClasses, classId]);

  // Selected names for reporting
  const selectedClassName = useMemo(() => {
    if (classId === 'all') return 'All Classes';
    const cls = availableClasses.find((c) => c.id === classId);
    return cls?.name || 'Selected Class';
  }, [availableClasses, classId]);

  const selectedSectionName = useMemo(() => {
    if (sectionId === 'all') return 'All Sections';
    const sec = availableSections.find((s) => s.id === sectionId);
    return sec?.name || '';
  }, [availableSections, sectionId]);

  const selectedGroupName = useMemo(() => {
    if (classGroupId === 'all') return '';
    const grp = classGroups.find((g) => g.id === classGroupId);
    return grp?.name || '';
  }, [classGroups, classGroupId]);

  const filterKey = `${classGroupId}|${classId}|${sectionId}|${statusFilter}|${genderFilter}|${debouncedSearch}`;

  const filterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (classGroupId !== 'all') params.set('classGroupId', classGroupId);
    if (classId !== 'all') params.set('classId', classId);
    if (sectionId !== 'all') params.set('sectionId', sectionId);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (genderFilter !== 'ALL') params.set('gender', genderFilter);
    if (debouncedSearch) params.set('q', debouncedSearch);
    return params;
  }, [classGroupId, classId, sectionId, statusFilter, genderFilter, debouncedSearch]);

  const loadAllStudents = useCallback(async () => {
    const params = filterParams();
    params.set('all', '1');
    const res = await fetch(`/api/reports/students?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch students report');
    const data = await res.json();
    const rows: StudentReportItem[] = Array.isArray(data.students) ? data.students : [];
    if (data.truncated) {
      toast.message(`Export includes the first ${rows.length} of ${data.total} students`);
    }
    return rows;
  }, [filterParams]);

  const fetchReportData = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = filterParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    fetch(`/api/reports/students?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch students report');
        return res.json();
      })
      .then((data) => {
        setStudents(Array.isArray(data.students) ? data.students : []);
        setStats(data.stats || null);
        setSchoolInfo(data.school || null);
        setTotal(Number(data.total) || 0);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error(err);
        toast.error('Failed to load student report data');
        setStudents([]);
        setTotal(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [filterParams, page]);

  const resetPageRef = useRef(false);

  useEffect(() => {
    setDocumentStudents([]);
    if (page !== 1) {
      resetPageRef.current = true;
      setPage(1);
    }
  }, [filterKey]);

  useEffect(() => {
    if (resetPageRef.current) {
      resetPageRef.current = false;
      if (page !== 1) return;
    }
    fetchReportData();
    return () => abortRef.current?.abort();
  }, [fetchReportData, page]);

  useEffect(() => {
    if (viewTab !== 'preview') return;
    let cancelled = false;
    setDocumentLoading(true);
    loadAllStudents()
      .then((rows) => {
        if (!cancelled) setDocumentStudents(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        toast.error('Failed to load the full report for preview');
        setDocumentStudents([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewTab, filterKey, loadAllStudents]);

  const handleClearFilters = () => {
    setClassGroupId('all');
    setClassId('all');
    setSectionId('all');
    setStatusFilter('ALL');
    setGenderFilter('ALL');
    setSearch('');
  };

  const hasActiveFilters =
    classGroupId !== 'all' ||
    classId !== 'all' ||
    sectionId !== 'all' ||
    statusFilter !== 'ALL' ||
    genderFilter !== 'ALL' ||
    Boolean(search);

  // Export handlers
  const handleExcelExport = async (type: 'general' | 'contacts' | 'attendance' = 'general') => {
    if (total === 0) {
      toast.error('No student records to export');
      return;
    }
    setExporting(true);
    try {
      const rows = await loadAllStudents();
      if (rows.length === 0) {
        toast.error('No student records to export');
        return;
      }
      await exportStudentsToExcel(
        rows,
        {
          schoolName: schoolInfo?.name || brand.name,
          className: selectedClassName,
          sectionName: selectedSectionName,
          classGroupName: selectedGroupName,
          academicYear: rows[0]?.academicYear || '',
          generatedAt: new Date(),
        },
        type
      );
      toast.success(`Excel downloaded successfully (${rows.length} students)`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Excel file');
    } finally {
      setExporting(false);
    }
  };

  const handleCsvExport = async () => {
    if (total === 0) {
      toast.error('No student records to export');
      return;
    }
    setExporting(true);
    try {
      const rows = await loadAllStudents();
      if (rows.length === 0) {
        toast.error('No student records to export');
        return;
      }
      exportStudentsToCsv(rows, {
        schoolName: schoolInfo?.name || brand.name,
        className: selectedClassName,
        sectionName: selectedSectionName,
      });
      toast.success(`CSV downloaded successfully (${rows.length} students)`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate CSV file');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (total === 0) {
      toast.error('No student records to print');
      return;
    }
    setExporting(true);
    try {
      const rows = documentStudents.length > 0 ? documentStudents : await loadAllStudents();
      if (rows.length === 0) {
        toast.error('No student records to print');
        return;
      }
      flushSync(() => setDocumentStudents(rows));
      window.print();
    } catch (err) {
      console.error(err);
      toast.error('Failed to prepare the printable report');
    } finally {
      setExporting(false);
    }
  };

  const currentAcademicYear =
    (documentStudents[0] || students[0])?.academicYear || 'Current Session';
  const printableStudents = documentStudents.length > 0 ? documentStudents : students;

  return (
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6">
      {/* On-screen Header (hidden in print) */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary font-semibold">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Reporting Center</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Class-Wise Student Information Report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter, inspect, and download complete student information by class in Excel (.xlsx), CSV, and Printable PDF format.
          </p>
        </div>

        {/* Action Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                disabled={loading || exporting || total === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Download Excel</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Select Excel Format
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleExcelExport('general')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="font-semibold text-xs">Standard Class Roster</p>
                  <p className="text-[11px] text-muted-foreground">Full student profile & admissions</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleExcelExport('contacts')}
              >
                <Phone className="mr-2 h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-semibold text-xs">Parent Contact Directory</p>
                  <p className="text-[11px] text-muted-foreground">Father CNIC, phone numbers, address</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleExcelExport('attendance')}
              >
                <Calendar className="mr-2 h-4 w-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-xs">Blank Attendance Sheet</p>
                  <p className="text-[11px] text-muted-foreground">Monthly 31-day roll-call register</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* CSV Export Button */}
          <Button
            variant="outline"
            disabled={loading || exporting || total === 0}
            onClick={handleCsvExport}
            className="gap-2 font-medium cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Download CSV</span>
          </Button>

          {/* Print / Save PDF Button */}
          <Button
            variant="outline"
            disabled={loading || exporting || total === 0}
            onClick={handlePrint}
            className="gap-2 font-medium border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      </div>

      {/* Filter Bento Card (hidden in print) */}
      <div className="bento-tile space-y-4 p-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
              Class & Enrollment Filters
            </h2>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Reset all filters
            </Button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {/* Class Group */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Class Group
            </label>
            <Select
              value={classGroupId}
              onValueChange={(val) => {
                setClassGroupId(val);
                setClassId('all');
                setSectionId('all');
              }}
            >
              <SelectTrigger className="h-10 w-full bg-muted/50 border-input">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {classGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Selector (Key Filter) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Class <span className="text-primary">*</span>
            </label>
            <Select
              value={classId}
              onValueChange={(val) => {
                setClassId(val);
                setSectionId('all');
              }}
            >
              <SelectTrigger className="h-10 w-full bg-card border-primary/40 font-medium">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Section
            </label>
            <Select
              value={sectionId}
              onValueChange={setSectionId}
              disabled={classId === 'all'}
            >
              <SelectTrigger className="h-10 w-full bg-muted/50 border-input">
                <SelectValue placeholder={classId === 'all' ? 'Select Class First' : 'All Sections'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableSections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Gender
            </label>
            <Select
              value={genderFilter}
              onValueChange={(val: any) => setGenderFilter(val)}
            >
              <SelectTrigger className="h-10 w-full bg-muted/50 border-input">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Genders</SelectItem>
                <SelectItem value="MALE">Boys Only</SelectItem>
                <SelectItem value="FEMALE">Girls Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enrollment Status */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="h-10 w-full bg-muted/50 border-input">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="SUSPENDED">Suspended Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="relative pt-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student name, roll number, admission number, father name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9 bg-muted/40 border-transparent focus:border-primary/40 focus:bg-card"
          />
        </div>
      </div>

      {/* KPI Stats Summary Cards (hidden in print) */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
          {/* Total Students */}
          <div className="bento-tile p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class Enrollment
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {stats.totalStudents}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedClassName}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Gender Ratio */}
          <div className="bento-tile p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Boys / Girls
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {stats.maleStudents} <span className="text-muted-foreground text-lg font-normal">/</span> {stats.femaleStudents}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stats.totalStudents > 0
                  ? `${Math.round((stats.maleStudents / stats.totalStudents) * 100)}% Boys`
                  : '0%'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>

          {/* Active Status */}
          <div className="bento-tile p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Students
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-emerald-600">
                {stats.activeStudents}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stats.suspendedStudents > 0
                  ? `${stats.suspendedStudents} Suspended`
                  : '100% in good standing'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          {/* Verified Contacts */}
          <div className="bento-tile p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contacts on File
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-amber-600">
                {stats.withPhoneCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stats.totalStudents > 0
                  ? `${Math.round((stats.withPhoneCount / stats.totalStudents) * 100)}% coverage`
                  : '0%'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Phone className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Tabs & Data Table) */}
      <div className="bento-tile overflow-hidden p-0 print:border-0 print:shadow-none">
        {/* Tabs Bar (hidden in print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border bg-muted/20 px-5 py-3 gap-3 print:hidden">
          <Tabs
            value={viewTab}
            onValueChange={(val: any) => setViewTab(val)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-muted/80">
              <TabsTrigger value="roster" className="gap-2 cursor-pointer text-xs">
                <Users className="h-3.5 w-3.5" />
                <span>Class Roster ({total})</span>
              </TabsTrigger>
              <TabsTrigger value="parents" className="gap-2 cursor-pointer text-xs">
                <Phone className="h-3.5 w-3.5" />
                <span>Parent Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2 cursor-pointer text-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>Print Document Preview</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{students.length}</strong> of {total}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={fetchReportData}
              title="Refresh Report Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Tab 1: Interactive Class Roster Table */}
        {viewTab === 'roster' && (
          <div className="overflow-x-auto print:hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground font-medium">
                  Generating class student report…
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  No students found
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {hasActiveFilters
                    ? 'No student records match your selected class and filters. Try choosing a different class or resetting filters.'
                    : 'No student records are currently available for this school.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-24">Roll No</TableHead>
                    <TableHead className="w-28">Admission No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Father / Guardian</TableHead>
                    <TableHead className="text-center">Gender</TableHead>
                    <TableHead>Class & Section</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {student.srNo}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {student.rollNumber || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {student.admissionNumber || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/students/${student.id}`}
                              className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                            >
                              {student.name}
                            </Link>
                            {student.email && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {student.fatherName || student.primaryGuardianName || '—'}
                          </p>
                          {student.fatherPhone && (
                            <p className="text-[11px] text-muted-foreground">
                              {student.fatherPhone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            student.gender === 'FEMALE'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                              : student.gender === 'MALE'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {student.gender === 'MALE'
                            ? 'Boy'
                            : student.gender === 'FEMALE'
                            ? 'Girl'
                            : student.gender}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-foreground">
                          {student.className}
                        </span>
                        {student.sectionName && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({student.sectionName})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.phone || student.fatherPhone ? (
                          <a
                            href={`tel:${student.phone || student.fatherPhone}`}
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{student.phone || student.fatherPhone}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            student.suspended
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              student.suspended ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                          />
                          {student.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/students/${student.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-medium text-primary hover:text-primary cursor-pointer"
                          >
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 2: Parent & Emergency Contact Directory */}
        {viewTab === 'parents' && (
          <div className="overflow-x-auto print:hidden">
            {students.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                No student parent records found.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-20">Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Father / Guardian Name</TableHead>
                    <TableHead>Father Phone</TableHead>
                    <TableHead>Father CNIC</TableHead>
                    <TableHead>Father Occupation</TableHead>
                    <TableHead>Mother Name</TableHead>
                    <TableHead>Residential Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {student.srNo}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {student.rollNumber || '—'}
                      </TableCell>
                      <TableCell className="font-semibold text-xs">
                        {student.name}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {student.fatherName || student.primaryGuardianName || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {student.fatherPhone || student.primaryGuardianPhone || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {student.fatherCnic || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {student.fatherOccupation || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {student.motherName || '—'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground">
                        {student.address || student.city || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {viewTab !== 'preview' && (
          <div className="px-5 pb-4 print:hidden">
            <ListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        )}

        {/* Tab 3: On-Screen Printable Document Preview */}
        {viewTab === 'preview' && (
          <div className="p-6 bg-slate-100 dark:bg-slate-900 border-t border-border print:hidden">
            <div className="mx-auto max-w-[1100px] mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  Exact representation of the printed / PDF document
                </span>
              </div>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-2 bg-primary text-primary-foreground cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4" />
                Print / Save Document Now
              </Button>
            </div>

            <div className="mx-auto max-w-[1100px] rounded-xl border border-slate-300 bg-white p-6 shadow-md text-slate-900">
              {documentLoading ? (
                <p className="py-16 text-center text-sm text-slate-500">
                  Loading the full class list for the printable document…
                </p>
              ) : (
                <PrintableStudentReport
                  school={
                    schoolInfo || {
                      name: brand.name,
                      initials: brand.initials,
                      address: brand.address,
                      email: brand.email,
                      phone: brand.phone,
                      logoPath: brand.logoPath,
                    }
                  }
                  students={documentStudents}
                  className={selectedClassName}
                  sectionName={selectedSectionName}
                  classGroupName={selectedGroupName}
                  academicYear={currentAcademicYear}
                  reportType="general"
                />
              )}
            </div>
          </div>
        )}

        {/* Printable Root: ALWAYS present for window.print() execution */}
        <div className="hidden print:block">
          <PrintableStudentReport
            school={
              schoolInfo || {
                name: brand.name,
                initials: brand.initials,
                address: brand.address,
                email: brand.email,
                phone: brand.phone,
                logoPath: brand.logoPath,
              }
            }
            students={printableStudents}
            className={selectedClassName}
            sectionName={selectedSectionName}
            classGroupName={selectedGroupName}
            academicYear={currentAcademicYear}
            reportType={viewTab === 'parents' ? 'contacts' : 'general'}
          />
        </div>
      </div>
    </div>
  );
}
