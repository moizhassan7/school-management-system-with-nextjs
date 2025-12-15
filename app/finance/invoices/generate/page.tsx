'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Receipt } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSidebar } from '@/contexts/SidebarContext';

const generateSchema = z.object({
    schoolId: z.string().min(1, "School is required"),
    classGroupId: z.string().min(1, "Class Group is required"), 
    classId: z.string().min(1, "Class is required"),
    month: z.string(),
    year: z.string().regex(/^\d{4}$/),
    dueDate: z.string().min(1, "Due date is required"),
});

type GenerateValues = z.infer<typeof generateSchema>;

export default function GenerateInvoicesPage() {
    const router = useRouter();
    
    // FIX 1: Only destructure 'schools' as it contains the full hierarchy
    const { schools } = useSidebar();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
    const [filteredClasses, setFilteredClasses] = useState<any[]>([]);

    // FIX 2: Derive flattened lists from the School Hierarchy
    // Get all groups for filtering logic
    const allGroups = schools.flatMap(s => 
        s.campuses.flatMap(c => 
            c.classGroups.map(cg => ({ ...cg, schoolId: s.id }))
        )
    );

    // Get all classes with their linkage info
    const allClasses = schools.flatMap(s => 
        s.campuses.flatMap(c => 
            c.classGroups.flatMap(cg => 
                (cg.classes || []).map(cls => ({ 
                    ...cls, 
                    classGroupId: cg.id,
                    schoolId: s.id 
                }))
            )
        )
    );

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

    const selectedSchool = form.watch('schoolId');
    const selectedGroup = form.watch('classGroupId');

    // Effect: Filter Groups when School changes
    useEffect(() => {
        if (selectedSchool) {
            const groupsInSchool = allGroups.filter(g => g.schoolId === selectedSchool);
            setFilteredGroups(groupsInSchool);
            form.setValue('classGroupId', ''); // Reset child selection
            form.setValue('classId', '');
        } else {
            setFilteredGroups([]);
        }
    }, [selectedSchool]);

    // Effect: Filter Classes when Group changes
    useEffect(() => {
        if (selectedGroup) {
            const classesInGroup = allClasses.filter(c => c.classGroupId === selectedGroup);
            setFilteredClasses(classesInGroup);
            form.setValue('classId', '');
        } else {
            setFilteredClasses([]);
        }
    }, [selectedGroup]);

    const onSubmit = async (data: GenerateValues) => {
        if(!confirm(`Generate invoices for Class ID: ${data.classId}? This cannot be undone.`)) return;
        
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

            alert(result.message);
            router.push('/finance/invoices'); 
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container max-w-2xl mx-auto py-10 px-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <Receipt className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Generate Monthly Invoices</h1>
                    </div>
                    <CardDescription>
                        This tool will bulk generate invoices for all active students in the selected class based on the fee structure.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* School Selection */}
                            <FormField control={form.control} name="schoolId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>School Branch</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedSchool}>
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

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                                {isSubmitting ? 'Processing...' : 'Generate Invoices'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}