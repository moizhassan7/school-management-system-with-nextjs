'use client';

import { useState } from 'react';
import { 
    Search, 
    User, 
    CreditCard, 
    Receipt, 
    CheckCircle2, 
    AlertCircle, 
    Loader2,
    Banknote,
    QrCode,
    Printer,
    Lock,
    History,
    Calendar,
    Wallet
} from "lucide-react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StudentDiscountManager from '@/components/finance/student-discount-manager';
import { toast } from 'sonner';

export default function FeeCollectionPage() {
  const [search, setSearch] = useState('');
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Search Student
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

  // 2. Open Modal for Specific Invoice
  const openPaymentModal = (invoice: any) => {
      setSelectedInvoice(invoice);
      // Default to remaining balance
      const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      setPaymentAmount(remaining.toString());
      setIsModalOpen(true);
  };

  // 3. Process Payment
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
                method: paymentMethod
            })
        });

        if (res.ok) {
            setIsModalOpen(false);
            handleSearch(); // Refresh data to show updated history/balance
            toast.success("Payment recorded successfully");
        } else {
            const err = await res.json();
            toast.error(err.error || 'Failed to record payment');
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to process payment");
    } finally {
        setPaymentLoading(false);
    }
  };

  const totalOutstanding = studentData?.invoices.reduce((acc: number, inv: any) => 
    acc + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0
  ) || 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 lg:p-8 space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Banknote className="h-8 w-8" /> 
                </div>
                Fee Collection
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Search student to view history and collect fees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (Search & Student Info) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Search Box */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs tracking-wider uppercase">SEARCH</span>
                        <input 
                            className="w-full pl-24 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold text-slate-900"
                            placeholder="Enter Admission No (e.g. 1045) or Name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="h-auto px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-base shadow-lg shadow-blue-500/20">
                        {loading ? <Loader2 className="animate-spin" /> : 'Find Student'}
                    </Button>
                </form>

                {/* Student Profile Card */}
                {studentData && (
                    <div className="mt-8 relative overflow-hidden bg-white border border-blue-100 rounded-2xl p-6 shadow-sm group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                            <div className="h-20 w-20 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-slate-400 text-2xl font-bold">
                                {studentData.name.charAt(0)}
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-1">
                                <h3 className="text-2xl font-black text-slate-900">{studentData.name}</h3>
                                <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-sm font-medium text-slate-500">
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        <User className="h-3.5 w-3.5" /> {studentData.admissionNumber}
                                    </span>
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        <History className="h-3.5 w-3.5" /> Class {studentData.className}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</p>
                                <p className="text-3xl font-black text-red-500 tracking-tight">${totalOutstanding.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Invoices List */}
            {studentData && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" /> Invoice History
                        </h2>
                        {/* Discount Manager Component */}
                        <StudentDiscountManager 
                             studentId={studentData.id} 
                             studentName={studentData.name} 
                        />
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Fee Month</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-right">Paid</th>
                                    <th className="px-6 py-4 text-right">Balance</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {studentData.invoices.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No pending invoices found.</td></tr>
                                ) : (
                                    studentData.invoices.map((inv: any) => {
                                        const pending = Number(inv.totalAmount) - Number(inv.paidAmount);
                                        const isPaid = pending <= 0;
                                        
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{format(new Date(0, inv.month - 1), 'MMMM yyyy')}</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{inv.invoiceNo}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={`
                                                        ${inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                                        ${inv.status === 'UNPAID' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                                        ${inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                                        font-bold border px-2.5 py-0.5 rounded-full
                                                    `}>
                                                        {inv.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-slate-600">${Number(inv.totalAmount).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-green-600">${Number(inv.paidAmount).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">${pending.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {!isPaid && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => openPaymentModal(inv)}
                                                            className="bg-white border border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all font-bold shadow-sm"
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

        {/* RIGHT COLUMN (Payment Summary / Info) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`bg-white rounded-xl shadow-lg border border-slate-200 sticky top-6 overflow-hidden ${!studentData ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="bg-slate-900 p-6 text-white pattern-grid-lg">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-400" /> Account Summary
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Real-time balance overview</p>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="text-center pb-6 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Outstanding</p>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">${totalOutstanding.toFixed(2)}</h1>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full shadow-sm text-green-600"><CheckCircle2 className="h-5 w-5"/></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Last Payment</p>
                                <p className="font-bold text-slate-700">Oct 24, 2025</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button variant="outline" className="w-full h-12 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900">
                            <Printer className="mr-2 h-4 w-4" /> Print Account Statement
                        </Button>
                    </div>

                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
                            <Lock className="h-3 w-3" /> Secure Transaction
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* --- PAYMENT & HISTORY MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Collect Payment
            </DialogTitle>
            <DialogDescription>
                Record a new transaction for <span className="font-bold text-slate-900">{format(new Date(0, (selectedInvoice?.month || 1) - 1), 'MMMM')} Invoice</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                
                {/* Left: Summary & History */}
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Total Amount</span>
                            <span className="font-mono font-bold">${Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Paid So Far</span>
                            <span className="font-mono font-bold text-green-600">${Number(selectedInvoice.paidAmount).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                            <span className="text-slate-900 font-bold">Remaining</span>
                            <span className="font-mono font-bold text-primary text-lg">
                                ${(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Transaction History Table */}
                    {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                <History className="h-3 w-3" /> Payment History
                            </h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                                        <tr>
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Method</th>
                                            <th className="p-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedInvoice.payments.map((pay: any) => (
                                            <tr key={pay.id} className="bg-white">
                                                <td className="p-2 text-slate-600 font-medium">{format(new Date(pay.date), 'dd MMM yy')}</td>
                                                <td className="p-2">
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-slate-50">{pay.method}</Badge>
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-green-600">+${Number(pay.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Payment Form */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="amount" className="text-sm font-bold text-slate-700">Paying Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <Input 
                                id="amount" 
                                type="number" 
                                className="pl-8 h-12 text-lg font-bold bg-white border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" 
                                value={paymentAmount} 
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="text-xs flex-1 border-slate-200 text-slate-600"
                                onClick={() => setPaymentAmount((Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)).toString())}
                            >
                                Pay Full Balance
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Payment Method</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {['CASH', 'CARD', 'ONLINE', 'BANK'].map((m) => (
                                <div 
                                    key={m}
                                    onClick={() => setPaymentMethod(m)}
                                    className={`
                                        cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 text-sm font-bold transition-all
                                        ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}
                                    `}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          )}

          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t border-slate-100">
            <div className="flex w-full justify-between items-center">
                <p className="text-xs text-slate-400 font-medium">Transaction ID will be generated automatically.</p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-slate-200 font-bold text-slate-600">Cancel</Button>
                    <Button onClick={handlePayment} disabled={paymentLoading} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md min-w-[140px]">
                        {paymentLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
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