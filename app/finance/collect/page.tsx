'use client';

import { useState } from 'react';
import { Search, CreditCard, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import StudentDiscountManager from '@/components/finance/student-discount-manager';

export default function FeeCollectionPage() {
  const [search, setSearch] = useState('');
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!search.trim()) return;
    
    setLoading(true);
    setStudentData(null);
    try {
      const res = await fetch(`/api/finance/search-dues?q=${search}`);
      if (res.ok) {
        const data = await res.json();
        setStudentData(data);
      } else {
        // Handle not found
        setStudentData(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    const pendingAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    setPaymentAmount(pendingAmount.toString()); // Default to full pending amount
    setIsModalOpen(true);
  };

  const processPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    
    const amountToPay = Number(paymentAmount);
    const pending = Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount);

    if (amountToPay <= 0 || amountToPay > pending) {
      alert("Invalid payment amount. Cannot be more than pending dues.");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: amountToPay,
          method: 'CASH' // You can add a select for this later
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        handleSearch(); // Refresh data to show updated balance
      }
    } catch (error) {
      console.error("Payment failed", error);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Fee Collection</h1>
        <p className="text-muted-foreground">Search for a student to view dues and collect payments.</p>
      </div>
      
      {/* Search Bar */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Enter Admission Number (e.g. ADM-001) or Student Name" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10 h-10"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-10 px-8">
              {loading ? <Loader2 className="animate-spin" /> : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {studentData ? (
        <div className="grid lg:grid-cols-3 gap-8">
          
         <div className="lg:col-span-1 space-y-6">
  <Card>
    <CardHeader className="bg-slate-50 border-b pb-4">
      <CardTitle className="text-lg">Student Profile</CardTitle>
    </CardHeader>
    <CardContent className="pt-6 space-y-4">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">Name</label>
        <p className="text-lg font-medium">{studentData.name}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">Admission No</label>
        <p className="text-base font-mono">{studentData.admissionNumber}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">Class / Section</label>
        <p className="text-base">{studentData.className}</p>
      </div>
      
      {/* 2. Add the Component Here */}
      <div className="pt-2">
          <StudentDiscountManager 
              studentId={studentData.id} 
              studentName={studentData.name} 
          />
      </div>

    </CardContent>
  </Card>
</div>

          {/* Invoices List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-600" /> 
              Pending Invoices
            </h2>
            
            {studentData.invoices.length === 0 ? (
              <Card className="border-dashed py-8 text-center bg-slate-50/50">
                <p className="text-muted-foreground">No pending dues found for this student.</p>
              </Card>
            ) : (
              studentData.invoices.map((inv: any) => {
                const total = Number(inv.totalAmount);
                const paid = Number(inv.paidAmount);
                const pending = total - paid;
                const isOverdue = new Date(inv.dueDate) < new Date();

                return (
                  <Card key={inv.id} className={`overflow-hidden transition-all hover:shadow-md ${isOverdue ? 'border-red-200' : ''}`}>
                    <div className="flex flex-col sm:flex-row">
                      {/* Left: Date Info */}
                      <div className={`p-4 sm:w-32 flex flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-slate-50'}`}>
                        <span className="text-xs uppercase font-bold text-muted-foreground">Due Date</span>
                        <span className="text-lg font-bold">{format(new Date(inv.dueDate), "MMM dd")}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "yyyy")}</span>
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 p-4 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-lg">{format(new Date(0, inv.month - 1), 'MMMM')} Fee</h3>
                          <Badge variant={inv.status === 'PARTIAL' ? 'secondary' : 'outline'}>{inv.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">{inv.invoiceNo}</div>
                      </div>

                      {/* Right: Amounts & Action */}
                      <div className="p-4 sm:w-48 bg-slate-50/30 flex flex-col justify-center gap-3 border-t sm:border-t-0 sm:border-l">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Pending Amount</div>
                          <div className="text-xl font-bold text-indigo-700">${pending.toFixed(2)}</div>
                          {paid > 0 && <div className="text-xs text-green-600 font-medium">Paid: ${paid.toFixed(2)}</div>}
                        </div>
                        <Button size="sm" onClick={() => openPaymentModal(inv)}>
                          <CreditCard className="mr-2 h-3.5 w-3.5" /> Collect
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      ) : (
        !loading && search && (
          <div className="text-center py-12 text-muted-foreground">
            No student found with that ID or Name.
          </div>
        )
      )}

      {/* Payment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>
              Enter the amount received from the student.
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-md space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Invoice:</span>
                  <span className="font-medium">${Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Already Paid:</span>
                  <span className="font-medium text-green-600">${Number(selectedInvoice.paidAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t mt-2">
                  <span className="font-bold">Balance Due:</span>
                  <span className="font-bold text-indigo-600">${(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input 
                    id="amount" 
                    type="number" 
                    className="pl-7 text-lg font-semibold" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={processPayment} disabled={paymentLoading}>
              {paymentLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}