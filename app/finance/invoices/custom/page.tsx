'use client';

import { useState, useEffect } from 'react';
import { Loader2, Printer, Search, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from '@/c omponents/ui/card';
import { Label } from '@/components/ui/label';
import { useSidebar } from '@/contexts/SidebarContext';
import PrintableChallan from '@/components/finance/printable-challan';

export default function CustomChallanPage() {
    const { schools } = useSidebar();
    const [feeHeads, setFeeHeads] = useState<any[]>([]);
    const [student, setStudent] = useState<any>(null);
    
    // Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Form States
    const [items, setItems] = useState<{feeHeadId: string, amount: string}[]>([{feeHeadId: '', amount: ''}]);
    const [cancelInvoiceNo, setCancelInvoiceNo] = useState('');
    const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/finance/fee-heads').then(res => res.json()).then(setFeeHeads);
    }, []);

    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/finance/search-dues?q=${searchQuery}`);
            if(res.ok) {
                const data = await res.json();
                setStudent({ 
                    name: data.name, 
                    id: data.id, 
                    studentRecord: { 
                        rollNumber: data.admissionNumber, 
                        myClass: { name: data.className } // Ensure structure matches PrintableChallan
                    } 
                }); 
                setGeneratedInvoice(null); // Reset preview on new search
            } else {
                alert("Student not found");
                setStudent(null);
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleGenerate = async () => {
        if(!student) return;
        
        // Validation
        const validItems = items.filter(i => i.feeHeadId && i.amount);
        if (validItems.length === 0) {
            alert("Please add at least one fee item.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/finance/invoices/custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: schools[0]?.id,
                    studentId: student.id,
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear(),
                    dueDate: new Date().toISOString(),
                    cancelInvoiceNo: cancelInvoiceNo.trim() || undefined, // Send barcode if exists
                    items: validItems.map(i => ({ feeHeadId: i.feeHeadId, amount: i.amount }))
                })
            });
            
            if(res.ok) {
                const invoice = await res.json();
                
                // Construct the preview object manually to avoid another fetch
                const printObj = {
                    ...invoice,
                    items: validItems.map(i => ({
                        id: Math.random().toString(), // Dummy ID for key
                        feeHead: feeHeads.find(f => f.id === i.feeHeadId),
                        amount: i.amount
                    }))
                };
                
                setGeneratedInvoice(printObj);
                setItems([{feeHeadId: '', amount: ''}]); // Reset form
                setCancelInvoiceNo('');
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-3xl font-bold">Generate Custom Challan</h1>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 print:hidden">
                {/* 1. Student Selection */}
                <Card>
                    <CardHeader><CardTitle>1. Select Student</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Admission No or Name" 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                        {student && (
                            <div className="p-4 bg-green-50 text-green-900 rounded border border-green-200 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg">{student.name}</p>
                                    <p className="text-sm opacity-80">{student.studentRecord.rollNumber} • {student.studentRecord.myClass.name}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setStudent(null); setGeneratedInvoice(null); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Fee Details */}
                <Card className={!student ? 'opacity-50 pointer-events-none' : ''}>
                    <CardHeader><CardTitle>2. Add Fees</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Cancellation Input */}
                        <div className="bg-red-50 p-3 rounded-md border border-red-100">
                            <Label className="text-xs font-bold text-red-600 uppercase mb-1 block">Optional: Cancel Previous Challan</Label>
                            <Input 
                                placeholder="Scan/Enter Barcode Number to Cancel" 
                                value={cancelInvoiceNo}
                                onChange={e => setCancelInvoiceNo(e.target.value)}
                                className="bg-white border-red-200 focus-visible:ring-red-500"
                            />
                        </div>

                        {/* Fee Items */}
                        <div className="space-y-2">
                            <Label>Fee Heads</Label>
                            {items.map((item, i) => (
                                <div key={i} className="flex gap-2">
                                    <Select onValueChange={(v) => {
                                        const newItems = [...items];
                                        newItems[i].feeHeadId = v;
                                        setItems(newItems);
                                    }} value={item.feeHeadId}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Fee" /></SelectTrigger>
                                        <SelectContent>
                                            {feeHeads.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input 
                                        type="number" 
                                        placeholder="Amount" 
                                        className="w-32" 
                                        value={item.amount}
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[i].amount = e.target.value;
                                            setItems(newItems);
                                        }}
                                    />
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => {
                                            if(items.length > 1) setItems(items.filter((_, idx) => idx !== i));
                                        }}
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                        
                        <Button variant="outline" size="sm" onClick={() => setItems([...items, {feeHeadId: '', amount: ''}])} className="w-full border-dashed">
                            <Plus className="h-4 w-4 mr-2" /> Add Another Fee
                        </Button>

                        <div className="pt-4 border-t">
                            <Button className="w-full" size="lg" disabled={loading} onClick={handleGenerate}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                Generate & Print
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Print Preview Area */}
            {generatedInvoice && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4 print:hidden">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Printer className="h-5 w-5" /> Ready to Print
                        </h2>
                        <Button onClick={() => window.print()}>Print Now</Button>
                    </div>
                    <div className="border p-4 bg-white shadow-sm overflow-auto">
                        <PrintableChallan 
                            invoice={generatedInvoice} 
                            student={student} 
                            schoolName={schools[0]?.name || "School Name"} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}