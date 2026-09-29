'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { useSidebar } from '@/contexts/SidebarContext';
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';
import PrintableChallan from '@/components/finance/printable-challan';

const MONTHS = [
  { value: 'all', label: 'All months' },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: format(new Date(2026, index, 1), 'MMMM'),
  })),
];

export default function ClassChallanPrintPage() {
  const { schools, isLoading: schoolsLoading } = useSidebar();
  const { brand } = useSchoolBrand();
  const [classGroupId, setClassGroupId] = useState('');
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [school, setSchool] = useState<{ name?: string; address?: string | null; logoPath?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const groups = useMemo(
    () =>
      schools.flatMap((schoolItem) =>
        schoolItem.campuses.flatMap((campus) =>
          campus.classGroups.map((group) => ({
            id: group.id,
            name: group.name,
            classes: group.classes || [],
          }))
        )
      ),
    [schools]
  );

  const classes = useMemo(() => {
    const group = groups.find((item) => item.id === classGroupId);
    return (group?.classes || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, classGroupId]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map(String);
  }, []);

  useEffect(() => {
    if (!classId) {
      setInvoices([]);
      setTotal(0);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ classId });
    if (month !== 'all') {
      params.set('month', month);
      params.set('year', year);
    }
    fetch(`/api/finance/invoices/class-print?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Could not load challans');
        setInvoices(Array.isArray(payload.data) ? payload.data : []);
        setTotal(Number(payload.total) || 0);
        setTruncated(Boolean(payload.truncated));
        setSchool(payload.school || null);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setInvoices([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load challans');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [classId, month, year]);

  const handlePrint = () => {
    if (!classId) {
      toast.error('Select a class first');
      return;
    }
    if (invoices.length === 0) {
      toast.error('This class has no invoices to print');
      return;
    }
    if (truncated) {
      toast.message(`Printing the first ${invoices.length} of ${total} challans`);
    }
    setPrinting(true);
    flushSync(() => setPrinting(true));
    window.print();
    setPrinting(false);
  };

  const className = classes.find((item) => item.id === classId)?.name || 'Class';

  return (
    <>
      <div className="page-content mx-auto w-full max-w-[1400px] space-y-6 print:hidden">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link href="/finance/invoices" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Invoices
          </Link>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Print class challans</h1>
          <p className="mt-1 text-muted-foreground">
            Choose a class and print every fee slip for that class in one go. Each student gets a bank, school, and student copy.
          </p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!classId || loading || invoices.length === 0 || printing}
          className="cursor-pointer gap-2 font-semibold shadow-md shadow-primary/20"
        >
          <Printer className="h-4 w-4" />
          {loading ? 'Loading challans…' : `Print all (${invoices.length})`}
        </Button>
      </div>

      <div className="bento-tile grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <Select
          value={classGroupId || undefined}
          onValueChange={(value) => {
            setClassGroupId(value);
            setClassId('');
          }}
          disabled={schoolsLoading}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Class group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classId || undefined} onValueChange={setClassId} disabled={!classGroupId}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder={classGroupId ? 'Class' : 'Select group first'} />
          </SelectTrigger>
          <SelectContent>
            {classes.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear} disabled={month === 'all'}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bento-tile overflow-hidden">
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading challans for {className}…</p>
        ) : !classId ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Select a class to see who will be printed.</p>
        ) : invoices.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No invoices for this class and month.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.student?.studentRecord?.rollNumber || '—'}</TableCell>
                  <TableCell className="font-medium">{invoice.student?.name}</TableCell>
                  <TableCell className="font-mono text-xs">{invoice.invoiceNo}</TableCell>
                  <TableCell>{format(new Date(invoice.year, invoice.month - 1), 'MMM yyyy')}</TableCell>
                  <TableCell className="text-right">Rs. {Number(invoice.totalAmount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      </div>

      <div className="challan-print-root challan-print-batch hidden">
        {invoices.map((invoice) => (
          <PrintableChallan
            key={invoice.id}
            invoice={invoice}
            student={invoice.student}
            schoolName={school?.name || brand.name}
            schoolAddress={school?.address || brand.address || undefined}
            schoolLogo={school?.logoPath || brand.logoPath}
          />
        ))}
      </div>
    </>
  );
}
