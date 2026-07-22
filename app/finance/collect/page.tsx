'use client';

import { useMemo, useState } from 'react';
import {
  User,
  CreditCard,
  Receipt,
  CheckCircle2,
  Loader2,
  Banknote,
  History,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import StudentDiscountManager from '@/components/finance/student-discount-manager';
import { toast } from 'sonner';

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FeeCollectionPage() {
  const [search, setSearch] = useState('');
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setStudentData(null);
    try {
      const res = await fetch(`/api/finance/search-dues?q=${search}`);
      if (res.ok) setStudentData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    setPaymentAmount(remaining.toString());
    setIsModalOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    setPaymentLoading(true);
    try {
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: Number(paymentAmount),
          method: paymentMethod,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        handleSearch();
        toast.success('Payment recorded successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to record payment');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const totalOutstanding =
    studentData?.invoices.reduce(
      (acc: number, inv: any) => acc + (Number(inv.totalAmount) - Number(inv.paidAmount)),
      0
    ) || 0;

  const lastPaymentDate = useMemo(() => {
    if (!studentData?.invoices?.length) return null;

    let latest: Date | null = null;
    for (const inv of studentData.invoices) {
      for (const pay of inv.payments ?? []) {
        const date = new Date(pay.date);
        if (!latest || date > latest) latest = date;
      }
    }
    return latest;
  }, [studentData]);

  return (
    <div className="page-content mx-auto w-full max-w-[1600px] space-y-6">
      <div>
        <h1 className="font-heading flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Banknote className="h-7 w-7" />
          </span>
          Fee Collection
        </h1>
        <p className="mt-1 text-muted-foreground">Search student to view history and collect fees.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="bento-tile space-y-6 p-5">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <Input
                className="h-12 rounded-xl bg-muted/50 text-base font-medium"
                placeholder="Enter Admission No (e.g. 1045) or Name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 cursor-pointer rounded-xl px-8 font-semibold shadow-md shadow-primary/20"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find Student'}
              </Button>
            </form>

            {studentData && (
              <div className="flex flex-col items-center gap-6 rounded-xl border border-border/70 bg-muted/30 p-5 sm:flex-row">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-card text-xl font-bold text-muted-foreground">
                  {studentData.name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h3 className="font-heading text-xl font-semibold text-foreground">{studentData.name}</h3>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <span className="flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2 py-1 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> {studentData.admissionNumber}
                    </span>
                    <span className="flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2 py-1 text-sm text-muted-foreground">
                      <History className="h-3.5 w-3.5" /> Class {studentData.className}
                    </span>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Due</p>
                  <p className="font-heading text-2xl font-bold text-destructive">{formatRs(totalOutstanding)}</p>
                </div>
              </div>
            )}
          </div>

          {studentData && (
            <div className="bento-tile overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Receipt className="h-5 w-5 text-primary" /> Invoice History
                  </h2>
                  <p className="text-sm text-muted-foreground">{studentData.invoices.length} invoice(s)</p>
                </div>
                <StudentDiscountManager studentId={studentData.id} studentName={studentData.name} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border/70 bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Fee Month</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 text-right font-semibold">Total</th>
                      <th className="px-5 py-3 text-right font-semibold">Paid</th>
                      <th className="px-5 py-3 text-right font-semibold">Balance</th>
                      <th className="px-5 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {studentData.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          No pending invoices found.
                        </td>
                      </tr>
                    ) : (
                      studentData.invoices.map((inv: any) => {
                        const pending = Number(inv.totalAmount) - Number(inv.paidAmount);
                        const isPaid = pending <= 0;

                        return (
                          <tr key={inv.id} className="transition-colors hover:bg-muted/30">
                            <td className="px-5 py-4">
                              <div className="font-medium text-foreground">
                                {format(new Date(0, inv.month - 1), 'MMMM yyyy')}
                              </div>
                              <div className="mt-0.5 font-mono text-xs text-muted-foreground">{inv.invoiceNo}</div>
                            </td>
                            <td className="px-5 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full font-semibold ${
                                  inv.status === 'PARTIAL'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : inv.status === 'UNPAID'
                                      ? 'border-red-200 bg-red-50 text-red-700'
                                      : inv.status === 'PAID'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : ''
                                }`}
                              >
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-muted-foreground">
                              {formatRs(Number(inv.totalAmount))}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-emerald-600">
                              {formatRs(Number(inv.paidAmount))}
                            </td>
                            <td className="px-5 py-4 text-right font-mono font-semibold text-foreground">
                              {formatRs(pending)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  onClick={() => openPaymentModal(inv)}
                                  className="cursor-pointer rounded-xl border-border bg-card font-semibold text-foreground hover:bg-primary hover:text-primary-foreground"
                                  variant="outline"
                                >
                                  Collect
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4">
          <div
            className={`bento-tile sticky top-6 overflow-hidden ${!studentData ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="border-b border-border/70 bg-primary/5 px-5 py-4">
              <h2 className="font-heading flex items-center gap-2 text-lg font-semibold text-foreground">
                <Wallet className="h-5 w-5 text-primary" /> Account Summary
              </h2>
              <p className="text-sm text-muted-foreground">Real-time balance overview</p>
            </div>

            <div className="space-y-5 p-5">
              <div className="border-b border-border/70 pb-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Outstanding
                </p>
                <p className="font-heading mt-1 text-4xl font-bold text-foreground">{formatRs(totalOutstanding)}</p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="rounded-full bg-card p-2 text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Payment</p>
                  <p className="font-medium text-foreground">
                    {lastPaymentDate ? format(lastPaymentDate, 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-xl font-semibold">
              <CreditCard className="h-5 w-5 text-primary" /> Collect Payment
            </DialogTitle>
            <DialogDescription>
              Record a new transaction for{' '}
              <span className="font-semibold text-foreground">
                {format(new Date(0, (selectedInvoice?.month || 1) - 1), 'MMMM')} Invoice
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="grid grid-cols-1 gap-8 py-4 md:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-mono font-semibold">{formatRs(Number(selectedInvoice.totalAmount))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid So Far</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {formatRs(Number(selectedInvoice.paidAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/70 pt-2 text-sm">
                    <span className="font-semibold text-foreground">Remaining</span>
                    <span className="font-mono text-lg font-semibold text-primary">
                      {formatRs(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount))}
                    </span>
                  </div>
                </div>

                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <History className="h-3 w-3" /> Payment History
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-border/70 text-sm">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Method</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {selectedInvoice.payments.map((pay: any) => (
                            <tr key={pay.id}>
                              <td className="p-2 font-medium text-muted-foreground">
                                {format(new Date(pay.date), 'dd MMM yy')}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className="h-5 bg-muted/50 px-1.5 text-[10px] font-normal">
                                  {pay.method}
                                </Badge>
                              </td>
                              <td className="p-2 text-right font-mono font-semibold text-emerald-600">
                                +{formatRs(Number(pay.amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="amount" className="text-sm font-semibold text-foreground">
                    Paying Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      className="h-12 rounded-xl pl-12 text-lg font-semibold"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full cursor-pointer rounded-xl text-xs"
                    onClick={() =>
                      setPaymentAmount(
                        (Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)).toString()
                      )
                    }
                  >
                    Pay Full Balance
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CASH', 'CARD', 'ONLINE', 'BANK'].map((m) => (
                      <div
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold transition-all ${
                          paymentMethod === m
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 border-t border-border/70 bg-muted/30 p-6">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Transaction ID will be generated automatically.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="min-w-[140px] cursor-pointer rounded-xl bg-cta font-semibold text-cta-foreground hover:bg-cta/90"
                >
                  {paymentLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
