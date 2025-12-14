'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    Search, 
    Printer, 
    Plus, 
    Filter, 
    MoreVertical, 
    Eye, 
    Send,
    FileText,
    CheckCircle2,
    Clock,
    XCircle
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    useEffect(() => {
        fetch('/api/finance/invoices')
            .then(res => res.json())
            .then(data => {
                setInvoices(data);
                setLoading(false);
            });
    }, []);

    // Derived State for Stats
    const totalActive = invoices.filter(i => i.status !== 'CANCELLED').length;
    const totalPaid = invoices.filter(i => i.status === 'PAID').length;
    const totalCancelled = invoices.filter(i => i.status === 'CANCELLED').length;

    const filteredInvoices = filterStatus === 'ALL' 
        ? invoices 
        : invoices.filter(i => i.status === filterStatus);

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-6 md:px-8 space-y-8">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Invoices & Payments</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage student fee invoices, track status, and generate reports.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm gap-2">
                        <Printer className="h-4 w-4" /> Print Report
                    </Button>
                    <Link href="/finance/invoices/generate">
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-md gap-2">
                            <Plus className="h-4 w-4" /> Generate Invoice
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Stats Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 flex flex-col md:flex-row gap-2">
                <button className="flex-1 py-3 px-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-primary font-semibold text-sm flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-900/50 transition-all">
                    <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">{totalActive}</span>
                    Active Invoices
                </button>
                <button className="flex-1 py-3 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-medium text-sm flex items-center justify-center gap-2 transition-all">
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-xs">{totalPaid}</span>
                    Paid History
                </button>
                <button className="flex-1 py-3 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-medium text-sm flex items-center justify-center gap-2 transition-all">
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-xs">{totalCancelled}</span>
                    Cancelled / Void
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT SIDEBAR (Filters) */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">Filter Invoices</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Narrow down by class or status</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Invoice Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['ALL', 'UNPAID', 'PAID', 'OVERDUE'].map(status => (
                                            <Badge 
                                                key={status}
                                                variant={filterStatus === status ? 'default' : 'outline'}
                                                className={`cursor-pointer ${filterStatus === status ? '' : 'hover:bg-slate-100'}`}
                                                onClick={() => setFilterStatus(status)}
                                            >
                                                {status}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Date Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input type="date" className="bg-slate-50" />
                                        <Input type="date" className="bg-slate-50" />
                                    </div>
                                </div>

                                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">Apply Filters</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Card */}
                    <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Financial Summary</h3>
                            
                            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                                <span className="text-sm font-medium text-red-700 dark:text-red-400">Overdue Amount</span>
                                <span className="text-lg font-bold text-red-700 dark:text-red-400">$12,450</span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                                <span className="text-sm font-medium text-green-700 dark:text-green-400">Collected (Month)</span>
                                <span className="text-lg font-bold text-green-700 dark:text-green-400">$45,200</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT CONTENT (Table) */}
                <div className="lg:col-span-9">
                    <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Invoices</h3>
                                <p className="text-sm text-slate-500">Displaying {filteredInvoices.length} records</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon"><Search className="h-5 w-5 text-slate-400" /></Button>
                                <Button variant="ghost" size="icon"><Filter className="h-5 w-5 text-slate-400" /></Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                                        <TableHead className="font-bold text-slate-500 uppercase text-xs py-4">Invoice ID</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-xs py-4">Student</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-xs py-4">Amount</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-xs py-4">Due Date</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-xs py-4">Status</TableHead>
                                        <TableHead className="text-right font-bold text-slate-500 uppercase text-xs py-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                                Loading invoices...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredInvoices.map((inv) => (
                                        <TableRow key={inv.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                                            <TableCell className="font-medium text-slate-900 dark:text-slate-200">{inv.invoiceNo}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {inv.student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">{inv.student.name}</div>
                                                        <div className="text-xs text-slate-500">{inv.student.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 dark:text-white">${Number(inv.totalAmount).toFixed(2)}</TableCell>
                                            <TableCell className="text-slate-500 text-sm">{format(new Date(inv.dueDate), "MMM dd, yyyy")}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    className={`
                                                        ${inv.status === 'PAID' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : ''}
                                                        ${inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' : ''}
                                                        ${inv.status === 'UNPAID' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200' : ''}
                                                        ${inv.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' : ''}
                                                        shadow-none font-medium px-2.5 py-0.5 rounded-full
                                                    `}
                                                >
                                                    {inv.status === 'PAID' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                    {inv.status === 'OVERDUE' && <XCircle className="w-3 h-3 mr-1" />}
                                                    {inv.status === 'UNPAID' && <Clock className="w-3 h-3 mr-1" />}
                                                    {inv.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><Eye className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><Send className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><MoreVertical className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}