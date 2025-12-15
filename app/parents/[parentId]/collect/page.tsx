'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ParentCollectPage({ params }: { params: Promise<{ parentId: string }> }) {
    const { parentId } = use(params);
    const router = useRouter();
    
    const [parent, setParent] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('CASH');
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Load parent details to show current Total Due
    useEffect(() => {
        fetch('/api/parents/financial-overview')
            .then(res => res.json())
            .then(data => {
                const found = data.find((p: any) => p.parentRecord?.id === parentId || p.id === parentId);
                // Note: The API returns users with parentRecord inside, or we might need to adjust logic depending on how your API IDs align. 
                // Assuming standard ID matching:
                if (found) setParent(found);
                else {
                    // Fallback search if IDs mismatch (User ID vs ParentRecord ID)
                    const foundByRecord = data.find((p: any) => p.id === parentId); 
                    setParent(foundByRecord || found);
                }
                setLoading(false);
            });
    }, [parentId]);

    const handlePayment = async () => {
        if (!amount || isNaN(Number(amount))) return;
        setProcessing(true);
        
        try {
            const res = await fetch(`/api/parents/${parentId}/collect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(amount),
                    method,
                    remarks: 'Parent Lump Sum Payment'
                })
            });

            if (!res.ok) throw new Error("Payment failed");
            const data = await res.json();
            setResult(data);
        } catch (error) {
            alert("Something went wrong processing the payment.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (result) {
        return (
            <div className="container max-w-2xl mx-auto py-10 px-4 space-y-6">
                <Card className="border-green-100 bg-green-50/50">
                    <CardHeader>
                        <div className="flex items-center gap-3 text-green-700 mb-2">
                            <CheckCircle2 className="h-8 w-8" />
                            <CardTitle>Payment Successful</CardTitle>
                        </div>
                        <CardDescription>
                            The amount of <span className="font-bold text-slate-900">${result.distributedAmount}</span> has been distributed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-white rounded-lg border p-4 space-y-2">
                            <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Distribution Breakdown</h4>
                            {result.breakdown.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0">
                                    <div>
                                        <p className="font-semibold text-slate-900">{item.student}</p>
                                        <p className="text-xs text-slate-500">Inv: {item.invoiceNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">+ ${item.paid}</p>
                                        <p className="text-xs text-slate-400">{item.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {result.remainingBalance > 0 && (
                            <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                                <AlertTitle>Excess Amount</AlertTitle>
                                <AlertDescription>
                                    ${result.remainingBalance} could not be applied to any invoice. Please return to parent or add to wallet.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button onClick={() => router.push(`/parents/${parentId}`)} variant="outline">Back to Parent</Button>
                            <Button onClick={() => { setResult(null); setAmount(''); }} >Collect Another</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-lg mx-auto py-10 px-4 space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/parents/${parentId}`}>
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <h1 className="text-2xl font-bold">Collect Family Fee</h1>
            </div>

            <Card className="bg-slate-900 text-white border-0">
                <CardContent className="pt-6">
                    <div className="text-slate-400 text-sm font-medium uppercase">Total Family Outstanding</div>
                    <div className="text-4xl font-bold mt-2">${parent?.totalFamilyDue?.toLocaleString() || '0'}</div>
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
                        <Label>Amount Received</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                className="pl-7 text-lg font-bold"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                <SelectItem value="ONLINE">Online / Card</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button 
                        className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" 
                        onClick={handlePayment}
                        disabled={processing || !amount || Number(amount) <= 0}
                    >
                        {processing ? <Loader2 className="animate-spin" /> : `Confirm & Distribute $${amount || '0'}`}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}