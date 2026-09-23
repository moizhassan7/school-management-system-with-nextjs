'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

function formatRs(value: number | string | undefined | null) {
  const n = Number(value ?? 0);
  return `Rs. ${n.toLocaleString()}`;
}

export default function ParentCollectPage({ params }: { params: Promise<{ parentId: string }> }) {
  const { parentId } = use(params);
  const router = useRouter();

  const [parent, setParent] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/parents/financial-overview?parentId=${encodeURIComponent(parentId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setParent(data?.id ? data : null))
      .catch(() => setParent(null))
      .finally(() => setLoading(false));
  }, [parentId]);

  const handlePayment = async () => {
    if (!amount || isNaN(Number(amount)) || processing) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/parents/${parentId}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          remarks: 'Parent Lump Sum Payment',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Payment failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong processing the payment.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
        <Card className="border-green-100 bg-green-50/50">
          <CardHeader>
            <div className="mb-2 flex items-center gap-3 text-green-700">
              <CheckCircle2 className="h-8 w-8" />
              <CardTitle>Payment Successful</CardTitle>
            </div>
            <CardDescription>
              The amount of{' '}
              <span className="font-bold text-slate-900">{formatRs(result.distributedAmount)}</span> has
              been distributed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg border bg-white p-4">
              <h4 className="text-sm font-medium tracking-wider text-slate-500 uppercase">
                Distribution Breakdown
              </h4>
              {(result.breakdown || []).map((item: any, i: number) => (
                <div key={i} className="flex justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <p className="font-semibold text-slate-900">{item.student}</p>
                    <p className="text-xs text-slate-500">Inv: {item.invoiceNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+ {formatRs(item.paid)}</p>
                    <p className="text-xs text-slate-400">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>

            {result.remainingBalance > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                <AlertTitle>Excess Amount</AlertTitle>
                <AlertDescription>
                  {formatRs(result.remainingBalance)} could not be applied to any invoice. Please return
                  to parent or add to wallet.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => router.push(`/parents/${parentId}`)} variant="outline">
                Back to Parent
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  setAmount('');
                }}
              >
                Collect Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg space-y-6 px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/parents/${parentId}`}>
          <Button variant="ghost" size="icon" aria-label="Back to parent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Collect Family Fee</h1>
      </div>

      <Card className="border-0 bg-slate-900 text-white">
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-slate-400 uppercase">Total Family Outstanding</div>
          <div className="mt-2 text-4xl font-bold">{formatRs(parent?.totalFamilyDue)}</div>
          <div className="mt-4 flex gap-2 text-sm opacity-80">
            <Wallet className="h-4 w-4" />
            <span>Paying for {parent?.childrenCount || 0} Children</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            The system will automatically pay off the oldest invoices for all children first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Received (Rs.)</Label>
            <div className="relative">
              <span className="absolute top-2.5 left-3 text-slate-500">Rs.</span>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                className="pl-10 text-lg font-bold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                disabled={processing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod} disabled={processing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="ONLINE">Online / Card</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="h-12 w-full text-lg font-bold bg-green-600 hover:bg-green-700"
            onClick={handlePayment}
            disabled={processing || !amount || Number(amount) <= 0}
          >
            {processing ? (
              <Loader2 className="animate-spin" />
            ) : (
              `Confirm & Distribute ${formatRs(amount || 0)}`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
