'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Receipt, Trash2 } from 'lucide-react';
import { format } from "date-fns";

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import {
    useSidebar,
    type ClassGroup,
    type ClassItem,
} from '@/contexts/SidebarContext';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const generateSchema = z.object({
    schoolId: z.string().min(1, "School is required"),
    classGroupId: z.string().min(1, "Class Group is required"), 
    classId: z.string().min(1, "Class is required"),
    month: z.string().regex(/^(?:[1-9]|1[0-2])$/),
    year: z.string().regex(/^\d{4}$/),
    dueDate: z.string().min(1, "Due date is required"),
});

type GenerateValues = z.infer<typeof generateSchema>;
type ClassGroupOption = ClassGroup & { schoolId: string };
type ClassOption = ClassItem & { classGroupId: string; schoolId: string };

export default function GenerateInvoicesPage() {
    const router = useRouter();
    
    // FIX 1: Only destructure 'schools' as it contains the full hierarchy
    const { schools } = useSidebar();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [pendingClassCancellation, setPendingClassCancellation] = useState<GenerateValues | null>(null);
    // FIX 2: Derive flattened lists from the School Hierarchy
    // Get all groups for filtering logic
    const allGroups = useMemo<ClassGroupOption[]>(() => schools.flatMap(s =>
        s.campuses.flatMap(c => 
            c.classGroups.map(cg => ({ ...cg, schoolId: s.id }))
        )
    ), [schools]);

    // Get all classes with their linkage info
    const allClasses = useMemo<ClassOption[]>(() => schools.flatMap(s =>
        s.campuses.flatMap(c => 
            c.classGroups.flatMap(cg => 
                (cg.classes || []).map(cls => ({ 
                    ...cls, 
                    classGroupId: cg.id,
                    schoolId: s.id 
                }))
            )
        )
    ), [schools]);

    const form = useForm<GenerateValues>({
        resolver: zodResolver(generateSchema),
        defaultValues: {
            schoolId: '',
            classGroupId: '',
            classId: '',
            month: (new Date().getMonth() + 1).toString(),
            year: new Date().getFullYear().toString(),
            dueDate: format(new Date(), 'yyyy-MM-dd'),
        },
    });

    const selectedSchool = useWatch({ control: form.control, name: 'schoolId' });
    const selectedGroup = useWatch({ control: form.control, name: 'classGroupId' });
    const filteredGroups = useMemo(
        () => allGroups.filter((group) => group.schoolId === selectedSchool),
        [allGroups, selectedSchool]
    );
    const filteredClasses = useMemo(
        () => allClasses.filter((item) => item.classGroupId === selectedGroup),
        [allClasses, selectedGroup]
    );

    const onSubmit = async (data: GenerateValues) => {
        const className = allClasses.find((item) => item.id === data.classId)?.name || 'the selected class';
        if (!confirm(`Generate ${data.month}/${data.year} invoices for ${className}?`)) return;
        
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/finance/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed');
            }

            toast.success(result.message);
            router.push('/finance/invoices'); 
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestClassCancellation = async () => {
        const valid = await form.trigger(['schoolId', 'classGroupId', 'classId', 'month', 'year']);
        if (!valid) return;
        setPendingClassCancellation(form.getValues());
    };

    const cancelClassInvoices = async () => {
        if (!pendingClassCancellation) return;

        setIsCancelling(true);
        try {
            const res = await fetch('/api/finance/invoices/cancel-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: pendingClassCancellation.schoolId,
                    classId: pendingClassCancellation.classId,
                    month: pendingClassCancellation.month,
                    year: pendingClassCancellation.year,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to cancel class invoices');

            toast.success(result.message);
            setPendingClassCancellation(null);
            router.push('/finance/invoices');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to cancel class invoices');
        } finally {
            setIsCancelling(false);
        }
    };

    const pendingClassName = allClasses.find(
        (item) => item.id === pendingClassCancellation?.classId
    )?.name;
    const pendingMonthName = pendingClassCancellation
        ? new Date(2000, Number(pendingClassCancellation.month) - 1).toLocaleString('default', { month: 'long' })
        : '';

    return (
        <div className="container max-w-2xl mx-auto py-10 px-4">
            <AlertDialog
                open={Boolean(pendingClassCancellation)}
                onOpenChange={(open) => {
                    if (!open && !isCancelling) setPendingClassCancellation(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Cancel {pendingMonthName} {pendingClassCancellation?.year} invoices for {pendingClassName || 'this class'}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Every unpaid invoice in this class and month will be cancelled. Paid and partially paid invoices will stay unchanged, and cancelled records remain available for audit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>Keep invoices</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isCancelling}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={(event) => {
                                event.preventDefault();
                                void cancelClassInvoices();
                            }}
                        >
                            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {isCancelling ? 'Cancelling…' : 'Cancel class invoices'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <Receipt className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Generate Monthly Invoices</h1>
                    </div>
                    <CardDescription>
                        This tool will bulk generate invoices for all active students in the selected class based on the fee structure.
                        For one student with custom amounts, use{' '}
                        <Link href="/finance/invoices/custom" className="font-medium text-primary hover:underline">
                            Custom Challan
                        </Link>
                        .
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* School Selection */}
                            <FormField control={form.control} name="schoolId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>School Branch</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            form.setValue('classGroupId', '');
                                            form.setValue('classId', '');
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                {/* Class Group Filter */}
                                <FormField control={form.control} name="classGroupId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Class Group</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                form.setValue('classId', '');
                                            }}
                                            defaultValue={field.value}
                                            disabled={!selectedSchool}
                                        >
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {filteredGroups.map(cg => <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Class Selection */}
                                <FormField control={form.control} name="classId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Class</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedGroup}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField control={form.control} name="month" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Month</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                                    <SelectItem key={m} value={m.toString()}>{new Date(0, m-1).toLocaleString('default', { month: 'long' })}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="year" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Year</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Due Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Button type="submit" disabled={isSubmitting || isCancelling}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                                    {isSubmitting ? 'Processing...' : 'Generate invoices'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={isSubmitting || isCancelling}
                                    onClick={() => void requestClassCancellation()}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Cancel class invoices
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
