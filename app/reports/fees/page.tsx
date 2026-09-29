'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, FileSpreadsheet, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { exportFeeRowsToCsv, exportFeeRowsToExcel } from '@/lib/reports/fee-export';

type ClassGroup = {
  id: string;
  name: string;
  classes: { id: string; name: string }[];
};

type PaidRow = {
  id: string;
  invoiceNo: string;
  studentName: string;
  fatherName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  month: number;
  year: number;
  status: string;
  paidAmount: number;
  method: string;
  paidOn: string;
};

type OutstandingRow = {
  studentId: string;
  studentName: string;
  fatherName: string;
  phone: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
};

const money = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function FeeReportsPage() {
  const [kind, setKind] = useState<'paid' | 'outstanding'>('paid');
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [classGroupId, setClassGroupId] = useState('all');
  const [classId, setClassId] = useState('all');
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Array<PaidRow | OutstandingRow>>([]);
  const [loadedKind, setLoadedKind] = useState<'paid' | 'outstanding'>('paid');
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    fetch('/api/reports/classes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClassGroups(data);
      })
      .catch(() => setClassGroups([]));
  }, []);

  const classes = useMemo(() => {
    const source =
      classGroupId === 'all' ? classGroups.flatMap((group) => group.classes || []) : classGroups.find((group) => group.id === classGroupId)?.classes || [];
    return source.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [classGroups, classGroupId]);

  const filterKey = `${kind}|${classGroupId}|${classId}|${month}|${year}`;

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({
      kind,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (classGroupId !== 'all') params.set('classGroupId', classGroupId);
    if (classId !== 'all') params.set('classId', classId);
    if (month !== 'all') {
      params.set('month', month);
      params.set('year', year);
    }
    fetch(`/api/reports/fees?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const payload = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error(payload.error || 'Could not load fee report');
        setLoadedKind(kind);
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setTotal(Number(payload.total) || 0);
        setSummary(payload.summary || {});
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load fee report');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, classGroupId, classId, month, year, page]);

  const loadAll = async () => {
    const params = new URLSearchParams({ kind, all: '1' });
    if (classGroupId !== 'all') params.set('classGroupId', classGroupId);
    if (classId !== 'all') params.set('classId', classId);
    if (month !== 'all') {
      params.set('month', month);
      params.set('year', year);
    }
    const res = await fetch(`/api/reports/fees?${params}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Could not export fee report');
    if (payload.truncated) toast.message('Export includes the first 5,000 matching invoices');
    return payload.rows as Array<PaidRow | OutstandingRow>;
  };

  const handleExport = async (formatType: 'excel' | 'csv') => {
    setExporting(true);
    try {
      const allRows = await loadAll();
      if (allRows.length === 0) {
        toast.error('Nothing to download for these filters');
        return;
      }
      const stamp = format(new Date(), 'yyyy-MM-dd');
      if (kind === 'paid') {
        const paid = allRows as PaidRow[];
        const headers = ['Invoice', 'Student', 'Father', 'Admission No', 'Roll No', 'Class', 'Section', 'Month', 'Paid', 'Method', 'Paid on', 'Status'];
        const body = paid.map((row) => [
          row.invoiceNo,
          row.studentName,
          row.fatherName,
          row.admissionNumber,
          row.rollNumber,
          row.className,
          row.sectionName,
          format(new Date(row.year, row.month - 1), 'MMM yyyy'),
          row.paidAmount,
          row.method || '—',
          row.paidOn && !Number.isNaN(new Date(row.paidOn).getTime())
            ? format(new Date(row.paidOn), 'dd MMM yyyy')
            : '',
          row.status,
        ]);
        if (formatType === 'excel') {
          await exportFeeRowsToExcel(`Paid_Fees_${stamp}.xlsx`, 'Paid Fees', 'Paid fees', headers, body);
        } else {
          exportFeeRowsToCsv(`Paid_Fees_${stamp}.csv`, headers, body);
        }
      } else {
        const due = allRows as OutstandingRow[];
        const headers = ['Student', 'Father', 'Phone', 'Admission No', 'Roll No', 'Class', 'Section', 'Unpaid invoices', 'Billed', 'Paid', 'Outstanding'];
        const body = due.map((row) => [
          row.studentName,
          row.fatherName,
          row.phone,
          row.admissionNumber,
          row.rollNumber,
          row.className,
          row.sectionName,
          row.invoiceCount,
          row.totalBilled,
          row.totalPaid,
          row.outstanding,
        ]);
        if (formatType === 'excel') {
          await exportFeeRowsToExcel(`Outstanding_Fees_${stamp}.xlsx`, 'Outstanding', 'Students with unpaid fees', headers, body);
        } else {
          exportFeeRowsToCsv(`Outstanding_Fees_${stamp}.csv`, headers, body);
        }
      }
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Fee reports</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Paid and outstanding fees</h1>
          <p className="mt-1 text-muted-foreground">
            Download every paid fee, or the students who still owe money with their total outstanding.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="cursor-pointer gap-2" disabled={exporting || total === 0} onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button className="cursor-pointer gap-2" disabled={exporting || total === 0} onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="bento-tile grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <Select
          value={classGroupId}
          onValueChange={(value) => {
            setClassGroupId(value);
            setClassId('all');
          }}
        >
          <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Class group" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {classGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {Array.from({ length: 12 }, (_, index) => (
              <SelectItem key={index + 1} value={String(index + 1)}>
                {format(new Date(2026, index, 1), 'MMMM')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear} disabled={month === 'all'}>
          <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((item) => (
              <SelectItem key={item} value={String(item)}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={kind}
        onValueChange={(value) => {
          const next = value as 'paid' | 'outstanding';
          setKind(next);
          setRows([]);
          setSummary({});
          setTotal(0);
          setLoading(true);
        }}
      >
        <TabsList>
          <TabsTrigger value="paid" className="cursor-pointer gap-2">
            <Wallet className="h-4 w-4" /> Paid fees
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="cursor-pointer gap-2">
            <AlertCircle className="h-4 w-4" /> Unpaid / outstanding
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="bento-tile p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {kind === 'paid' ? 'Amount collected' : 'Total outstanding'}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold">
              {money(kind === 'paid' ? (loadedKind === 'paid' ? summary.totalCollected || 0 : 0) : loadedKind === 'outstanding' ? summary.totalOutstanding || 0 : 0)}
            </p>
          </div>
          <div className="bento-tile p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {kind === 'paid' ? 'Paid invoices' : 'Students with dues'}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold">
              {kind === 'paid'
                ? loadedKind === 'paid' ? summary.invoiceCount || 0 : 0
                : loadedKind === 'outstanding' ? summary.studentCount || 0 : 0}
            </p>
          </div>
          <div className="bento-tile p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unpaid invoices</p>
            <p className="mt-1 font-heading text-2xl font-bold">
              {kind === 'outstanding' && loadedKind === 'outstanding' ? summary.invoiceCount || 0 : '—'}
            </p>
          </div>
        </div>

        <TabsContent value="paid" className="bento-tile mt-4 overflow-hidden p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading fee report…</p>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No paid fees match these filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kind === 'paid' && loadedKind === 'paid' && (rows as PaidRow[]).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.studentName}</p>
                      <p className="text-xs text-muted-foreground">{row.fatherName || row.admissionNumber || '—'}</p>
                    </TableCell>
                    <TableCell>{row.className}{row.sectionName ? ` (${row.sectionName})` : ''}</TableCell>
                    <TableCell className="font-mono text-xs">{row.invoiceNo}</TableCell>
                    <TableCell>
                      {row.year && row.month ? format(new Date(row.year, row.month - 1), 'MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell>{row.method || row.status}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.paidAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="outstanding" className="bento-tile mt-4 overflow-hidden p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading fee report…</p>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No students have an outstanding balance for these filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Father</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kind === 'outstanding' && loadedKind === 'outstanding' && (rows as OutstandingRow[]).map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>
                      <p className="font-medium">{row.studentName}</p>
                      <p className="text-xs text-muted-foreground">{row.admissionNumber || row.phone || '—'}</p>
                    </TableCell>
                    <TableCell>{row.fatherName || '—'}</TableCell>
                    <TableCell>{row.className}{row.sectionName ? ` (${row.sectionName})` : ''}</TableCell>
                    <TableCell>{row.invoiceCount}</TableCell>
                    <TableCell className="text-right">{money(row.totalBilled)}</TableCell>
                    <TableCell className="text-right">{money(row.totalPaid)}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{money(row.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} disabled={loading} />
    </div>
  );
}
