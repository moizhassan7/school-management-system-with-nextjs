'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
    Search, 
    Plus, 
    MoreVertical, 
    Eye, 
    Send,
    CheckCircle2,
    Clock,
    XCircle,
    FileText,
    Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from 'sonner';

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ListPagination } from '@/components/list-pagination';
import { EmptyState } from '@/components/empty-state';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 25;
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [filterStatus, debouncedSearch]);

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            if (filterStatus !== 'ALL') params.set('status', filterStatus);
            if (debouncedSearch) params.set('q', debouncedSearch);
            const res = await fetch(`/api/finance/invoices?${params}`);
            const payload = await res.json();
            if (Array.isArray(payload)) {
                setInvoices(payload);
                setTotal(payload.length);
            } else {
                setInvoices(Array.isArray(payload.data) ? payload.data : []);
                setTotal(Number(payload.total) || 0);
            }
        } catch {
            setInvoices([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
    }, [page, filterStatus, debouncedSearch]);

    const handleSendInvoice = async (invoiceId: string) => {
        setActionLoadingId(invoiceId);
        try {
            const res = await fetch(`/api/finance/invoices/${invoiceId}/send`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send invoice');
            toast.success(data.message || 'Invoice sent');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invoice');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleStatusUpdate = async (invoiceId: string, action: 'MARK_PAID' | 'MARK_UNPAID' | 'CANCEL') => {
        setActionLoadingId(invoiceId);
        try {
            const res = await fetch(`/api/finance/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update invoice');
            toast.success('Invoice updated');
            await loadInvoices();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update invoice');
        } finally {
            setActionLoadingId(null);
        }
    };

    const stats = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let overdueAmount = 0;
        let collectedThisMonth = 0;
        let unpaidCount = 0;
        let paidCount = 0;

        for (const inv of invoices) {
            const total = Number(inv.totalAmount) || 0;
            const paid = Number(inv.paidAmount) || 0;
            const balance = Math.max(total - paid, 0);

            if (inv.status === 'PAID') paidCount += 1;
            if (['UNPAID', 'PARTIAL', 'OVERDUE'].includes(inv.status)) unpaidCount += 1;
            if (inv.status === 'OVERDUE' || (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < now)) {
                overdueAmount += balance;
            }
            if (inv.status === 'PAID' && inv.updatedAt && new Date(inv.updatedAt) >= monthStart) {
                collectedThisMonth += paid;
            } else if (paid > 0 && inv.updatedAt && new Date(inv.updatedAt) >= monthStart) {
                collectedThisMonth += paid;
            }
        }

        return {
            totalActive: invoices.filter((i) => i.status !== 'CANCELLED').length,
            paidCount,
            unpaidCount,
            overdueAmount,
            collectedThisMonth,
        };
    }, [invoices]);

    const filteredInvoices = invoices;

    return (
        <div className="page-content mx-auto w-full max-w-[1600px] space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Invoices & Payments</h1>
                    <p className="mt-1 text-muted-foreground">Manage student fee invoices and track payment status.</p>
                </div>
                <Link href="/finance/invoices/generate">
                    <Button className="cursor-pointer gap-2 font-semibold shadow-md shadow-primary/20">
                        <Plus className="h-4 w-4" /> Generate Invoice
                    </Button>
                </Link>
            </div>

            <div className="bento-grid">
                <div className="bento-tile bento-tile-featured flex flex-col justify-between p-5">
                    <FileText className="h-5 w-5 text-white/80" />
                    <div>
                        <p className="text-sm text-teal-100">Active Invoices</p>
                        <h3 className="mt-1 font-heading text-3xl font-bold text-white">{stats.totalActive}</h3>
                    </div>
                </div>
                <div className="bento-tile flex flex-col justify-between p-5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                        <p className="text-sm text-muted-foreground">Paid</p>
                        <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{stats.paidCount}</h3>
                    </div>
                </div>
                <div className="bento-tile flex flex-col justify-between p-5">
                    <Wallet className="h-5 w-5 text-cta" />
                    <div>
                        <p className="text-sm text-muted-foreground">Overdue Amount</p>
                        <h3 className="mt-1 font-heading text-2xl font-bold text-destructive">
                            Rs. {stats.overdueAmount.toLocaleString()}
                        </h3>
                    </div>
                </div>
                <div className="bento-tile flex flex-col justify-between p-5">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">Collected (This Month)</p>
                        <h3 className="mt-1 font-heading text-2xl font-bold text-emerald-600">
                            Rs. {stats.collectedThisMonth.toLocaleString()}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="bento-tile space-y-5 p-5 lg:col-span-3">
                    <div>
                        <h3 className="font-heading text-lg font-semibold text-foreground">Filters</h3>
                        <p className="text-sm text-muted-foreground">Filter by status or search</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="rounded-xl bg-muted/50 pl-10"
                            placeholder="Search invoice or student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Invoice Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'].map((status) => (
                                <Badge
                                    key={status}
                                    variant={filterStatus === status ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => setFilterStatus(status)}
                                >
                                    {status}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bento-tile overflow-hidden lg:col-span-9">
                    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                        <div>
                            <h3 className="font-heading text-lg font-semibold text-foreground">Invoices</h3>
                            <p className="text-sm text-muted-foreground">
                                {total === 0 ? 'No invoices on this page' : `${total} total matching invoices`}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Loading invoices...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="p-0">
                                            <EmptyState
                                                className="border-0 py-16"
                                                title={debouncedSearch || filterStatus !== 'ALL' ? 'No invoices match your filters' : 'No invoices yet'}
                                                description={
                                                    debouncedSearch || filterStatus !== 'ALL'
                                                        ? 'Try clearing search or status filters.'
                                                        : 'Generate monthly invoices to get started.'
                                                }
                                                actionLabel={debouncedSearch || filterStatus !== 'ALL' ? undefined : 'Generate invoices'}
                                                actionHref={debouncedSearch || filterStatus !== 'ALL' ? undefined : '/finance/invoices/generate'}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        {inv.student?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-foreground">{inv.student?.name}</div>
                                                        <div className="text-xs text-muted-foreground">{inv.student?.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                Rs. {Number(inv.totalAmount || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {inv.dueDate ? format(new Date(inv.dueDate), 'MMM dd, yyyy') : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`
                                                        ${inv.status === 'PAID' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : ''}
                                                        ${inv.status === 'OVERDUE' ? 'border-red-200 bg-red-100 text-red-700' : ''}
                                                        ${inv.status === 'UNPAID' ? 'border-amber-200 bg-amber-100 text-amber-700' : ''}
                                                        ${inv.status === 'PARTIAL' ? 'border-primary/30 bg-secondary text-primary' : ''}
                                                        shadow-none
                                                    `}
                                                >
                                                    {inv.status === 'PAID' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                                    {inv.status === 'OVERDUE' && <XCircle className="mr-1 h-3 w-3" />}
                                                    {inv.status === 'UNPAID' && <Clock className="mr-1 h-3 w-3" />}
                                                    {inv.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/finance/invoices/${inv.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 cursor-pointer"
                                                        disabled={actionLoadingId === inv.id}
                                                        onClick={() => handleSendInvoice(inv.id)}
                                                    >
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(inv.id, 'MARK_PAID')}>
                                                                Mark paid
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(inv.id, 'MARK_UNPAID')}>
                                                                Mark unpaid
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(inv.id, 'CANCEL')}>
                                                                Cancel invoice
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="px-5 pb-5">
                        <ListPagination
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={setPage}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
