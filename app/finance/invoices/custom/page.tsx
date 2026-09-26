'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type StudentOption = {
  id: string;
  name: string;
  schoolId?: string | null;
  studentRecord?: {
    admissionNumber?: string | null;
    myClass?: { name?: string | null } | null;
  } | null;
};

type FeeHead = {
  id: string;
  name: string;
  type?: 'MONTHLY' | 'ONE_TIME' | string | null;
  schoolId?: string | null;
};

type LineItem = {
  key: string;
  feeHeadId: string;
  name: string;
  amount: string;
  kind: 'FEE' | 'ONE_TIME';
};

const months = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Date(0, index).toLocaleString('default', { month: 'long' }),
}));

function lineKey(prefix: string, feeHeadId: string) {
  return `${prefix}-${feeHeadId}`;
}

export default function CustomChallanPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lines, setLines] = useState<LineItem[]>([]);
  const [loadingFee, setLoadingFee] = useState(false);
  const [oneTimeHeadId, setOneTimeHeadId] = useState('');
  const [oneTimeAmount, setOneTimeAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/finance/fee-heads')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load fee heads');
        setFeeHeads(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not load fee heads');
      });
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setStudents([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(term)}&pageSize=10`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Student search failed');
        setStudents(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        setStudents([]);
        toast.error(error instanceof Error ? error.message : 'Student search failed');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const visibleHeads = useMemo(() => {
    if (!student?.schoolId) return feeHeads;
    const scoped = feeHeads.filter((head) => head.schoolId === student.schoolId);
    return scoped.length > 0 ? scoped : feeHeads;
  }, [feeHeads, student]);

  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const feeLines = lines.filter((line) => line.kind === 'FEE');
  const oneTimeLines = lines.filter((line) => line.kind === 'ONE_TIME');

  const oneTimeHeads = useMemo(
    () =>
      visibleHeads
        .filter((head) => !lines.some((line) => line.feeHeadId === head.id))
        .sort((a, b) => Number(b.type === 'ONE_TIME') - Number(a.type === 'ONE_TIME')),
    [visibleHeads, lines]
  );

  const applyStudentFee = async (studentId: string) => {
    setLoadingFee(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load student fee');

      const record = data.studentRecord;
      let source = Array.isArray(record?.feeStructure?.items) ? record.feeStructure.items : [];
      if (source.length === 0 && record?.classId) {
        const classRes = await fetch(`/api/finance/fee-structures?classId=${record.classId}`);
        const classData = await classRes.json();
        if (classRes.ok && Array.isArray(classData)) source = classData;
      }

      const nextFeeLines: LineItem[] = source
        .filter((item: { feeHeadId?: string; amount?: number }) => item.feeHeadId)
        .map((item: { feeHeadId: string; amount?: number; feeHead?: { name?: string } }) => ({
          key: lineKey('fee', item.feeHeadId),
          feeHeadId: item.feeHeadId,
          name: item.feeHead?.name || 'Fee',
          amount: String(Number(item.amount ?? 0)),
          kind: 'FEE' as const,
        }));

      setLines((current) => [...nextFeeLines, ...current.filter((line) => line.kind === 'ONE_TIME')]);
      if (nextFeeLines.length === 0) {
        toast.error('This student has no fee yet. Set it on Edit Student, or add one-time charges below.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load student fee');
    } finally {
      setLoadingFee(false);
    }
  };

  const updateAmount = (key: string, amount: string) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, amount } : line)));
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  };

  const addOneTimeCharge = () => {
    const head = visibleHeads.find((item) => item.id === oneTimeHeadId);
    if (!head) return;
    if (lines.some((line) => line.feeHeadId === head.id)) {
      toast.error('That charge is already on this challan');
      return;
    }
    if (oneTimeAmount === '' || Number(oneTimeAmount) < 0) {
      toast.error('Enter an amount for the one-time charge');
      return;
    }
    setLines((current) => [
      ...current,
      {
        key: lineKey('once', head.id),
        feeHeadId: head.id,
        name: head.name,
        amount: oneTimeAmount,
        kind: 'ONE_TIME',
      },
    ]);
    setOneTimeHeadId('');
    setOneTimeAmount('');
  };

  const onSubmit = async () => {
    if (!student) {
      toast.error('Select a student first');
      return;
    }

    const items = lines
      .filter((line) => line.feeHeadId && Number(line.amount) > 0)
      .map((line) => ({ feeHeadId: line.feeHeadId, amount: Number(line.amount) }));

    if (items.length === 0) {
      toast.error('Add at least one fee head with an amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/invoices/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          schoolId: student.schoolId || undefined,
          month: Number(month),
          year: Number(year),
          dueDate,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not create challan');
      }
      toast.success(
        data.updatedExisting
          ? `Charges added to challan ${data.invoiceNo}. The previous challan was kept.`
          : `Challan ${data.invoiceNo} created`
      );
      router.push(`/finance/invoices/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create challan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Custom Challan</h1>
        <p className="mt-1 text-muted-foreground">
          Charge a student who was admitted after the class invoices were already generated. Their fee and any extra charges, such as Late Comer Fine, go on the challan. An open challan for that month is kept and the new charges are added to it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Receipt className="h-5 w-5" />
            <CardTitle>Student</CardTitle>
          </div>
          <CardDescription>Search by name or admission number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type at least 2 characters"
          />
          {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
          {students.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
              {students.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setStudent(option);
                    setStudents([]);
                    setQuery('');
                    setLines((current) => current.filter((line) => line.kind === 'ONE_TIME'));
                    applyStudentFee(option.id);
                  }}
                >
                  <span className="font-medium text-foreground">{option.name}</span>
                  <span className="text-muted-foreground">
                    {option.studentRecord?.admissionNumber || 'No admission no.'}
                    {option.studentRecord?.myClass?.name ? ` · ${option.studentRecord.myClass.name}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          {student && (
            <div className="rounded-xl bg-secondary px-3 py-2 text-sm">
              <span className="font-semibold text-foreground">{student.name}</span>
              <span className="text-muted-foreground">
                {' '}
                · {student.studentRecord?.admissionNumber || 'No admission no.'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Period</CardTitle>
          <CardDescription>Month, year, and the date this challan is due.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="challan-year">Year</Label>
            <Input id="challan-year" value={year} onChange={(event) => setYear(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challan-due">Due date</Label>
            <Input
              id="challan-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Student fee</CardTitle>
              <CardDescription>
                Uses this student&apos;s own fee. If none is saved, the class fee is used. You can change an amount before saving.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!student || loadingFee}
              onClick={() => student && applyStudentFee(student.id)}
            >
              {loadingFee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply student fee
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!student ? (
            <p className="text-sm text-muted-foreground">Select a student to load their fee.</p>
          ) : loadingFee ? (
            <p className="text-sm text-muted-foreground">Loading fee...</p>
          ) : feeLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fee lines yet. Apply the student fee, or add one-time charges below.</p>
          ) : (
            feeLines.map((line) => (
              <div key={line.key} className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_160px_auto]">
                <span className="text-sm font-medium text-foreground">{line.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rs.</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(event) => updateAmount(line.key, event.target.value)}
                    className="text-right"
                  />
                </div>
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => removeLine(line.key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>One-time charges</CardTitle>
          <CardDescription>
            Admission, books, uniform, or any other charge that is not part of the monthly fee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oneTimeLines.map((line) => (
            <div key={line.key} className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_160px_auto]">
              <span className="text-sm font-medium text-foreground">{line.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rs.</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  onChange={(event) => updateAmount(line.key, event.target.value)}
                  className="text-right"
                />
              </div>
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => removeLine(line.key)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_auto]">
            <Select value={oneTimeHeadId || undefined} onValueChange={setOneTimeHeadId}>
              <SelectTrigger>
                <SelectValue placeholder="One-time charge" />
              </SelectTrigger>
              <SelectContent>
                {oneTimeHeads.map((head) => (
                  <SelectItem key={head.id} value={head.id}>
                    {head.name}
                    {head.type === 'ONE_TIME' ? ' · One time' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={oneTimeAmount}
              onChange={(event) => setOneTimeAmount(event.target.value)}
            />
            <Button type="button" variant="outline" className="cursor-pointer gap-2" disabled={!oneTimeHeadId} onClick={addOneTimeCharge}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {oneTimeHeads.length === 0 && oneTimeLines.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add a fee head in Finance → Configuration, then pick it here as a one-time charge.
            </p>
          )}

          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Entered total</span>
            <span className="font-heading text-xl font-bold text-foreground">Rs. {total.toLocaleString()}</span>
          </div>

          <Button type="button" className="w-full cursor-pointer" disabled={submitting} onClick={onSubmit}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
            {submitting ? 'Creating challan...' : 'Create challan'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
