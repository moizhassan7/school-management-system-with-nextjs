'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Loader2, Search, Save, X, Building2, User, Users, Calendar, 
    Phone, Mail, MapPin, Check, Upload, GraduationCap, Briefcase 
} from 'lucide-react';
import { format } from "date-fns";
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// --- Validation Schema ---
const studentFormSchema = z.object({
    name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
    phone: z.string().optional(),
    address: z.string().optional(),
    
    schoolId: z.string().min(1, 'School is required'),
    campusId: z.string().min(1, 'Campus is required'),
    classGroupId: z.string().min(1, 'Class Group is required'),
    classId: z.string().min(1, 'Class is required'),
    sectionId: z.string().optional(),
    subjectGroupId: z.string().optional(),
    
    admissionNumber: z.string().min(1, 'Admission number is required'),
    rollNumber: z.string().optional(),
    admissionDate: z.string().min(1, 'Admission date is required'),
    
    startYear: z.string().regex(/^\d{4}$/, 'Must be 4 digits'),
    stopYear: z.string().regex(/^\d{4}$/, 'Must be 4 digits'),

    parentMode: z.enum(['LINK', 'CREATE']),
    selectedParentId: z.string().optional(),
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional().or(z.literal('')),
    parentPhone: z.string().optional(),
    parentCnic: z.string().optional(),
    parentOccupation: z.string().optional(),
    relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
});

type FormValues = z.infer<typeof studentFormSchema>;

interface FeeItemDraft {
    feeHeadId: string;
    feeHeadName: string;
    amount: string;
}

interface ParentContactDraft {
    relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
    name: string;
    cnic: string;
    phone: string;
    occupation: string;
    email: string;
    required?: boolean;
}

export default function StudentForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedPhotoName, setSelectedPhotoName] = useState('');

    // --- Data States ---
    const [schools, setSchools] = useState<any[]>([]);
    const [rawClassGroups, setRawClassGroups] = useState<any[]>([]);
    
    // Filtered Options
    const [availableCampuses, setAvailableCampuses] = useState<any[]>([]);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [availableStreams, setAvailableStreams] = useState<any[]>([]);
    const [availableSections, setAvailableSections] = useState<any[]>([]);

    // Parent Search
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedParent, setSelectedParent] = useState<any>(null);
    const [classFeeItems, setClassFeeItems] = useState<FeeItemDraft[]>([]);
    const [selectedFeeItems, setSelectedFeeItems] = useState<FeeItemDraft[]>([]);
    const [isLoadingFeeStructure, setIsLoadingFeeStructure] = useState(false);
    const [parentContacts, setParentContacts] = useState<ParentContactDraft[]>([
        {
            relationship: 'FATHER',
            name: '',
            cnic: '',
            phone: '',
            occupation: '',
            email: '',
            required: true,
        },
    ]);

    const form = useForm<FormValues>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: {
            name: '', email: '', password: '', gender: 'MALE', phone: '', address: '',
            schoolId: '', campusId: '', classGroupId: '', classId: '', sectionId: '', subjectGroupId: '',
            admissionNumber: '', rollNumber: '', admissionDate: format(new Date(), 'yyyy-MM-dd'),
            startYear: new Date().getFullYear().toString(),
            stopYear: (new Date().getFullYear() + 1).toString(),
            parentMode: 'CREATE', relationship: 'FATHER',
            parentName: '', parentEmail: '', parentPhone: '', parentCnic: '', parentOccupation: ''
        },
    });

    // --- Logic Effects (Keep existing logic) ---
    useEffect(() => {
        const loadData = async () => {
            try {
                const [schoolRes, groupRes] = await Promise.all([
                    fetch('/api/schools'),
                    fetch('/api/class-groups')
                ]);
                if(schoolRes.ok) setSchools(await schoolRes.json());
                if(groupRes.ok) setRawClassGroups(await groupRes.json());
            } catch(e) { console.error("Data load failed", e); }
        };
        loadData();
    }, []);

    // ... (Keep existing filtering effects for Campus, Group, Class, Section) ...
    const selectedSchool = form.watch('schoolId');
    const selectedCampus = form.watch('campusId');
    const selectedGroup = form.watch('classGroupId');
    const selectedClass = form.watch('classId');

    useEffect(() => {
        if (!selectedSchool) { setAvailableCampuses([]); return; }
        const campusMap = new Map();
        rawClassGroups.forEach(g => {
            if (g.campus && g.campus.schoolId === selectedSchool) {
                campusMap.set(g.campusId, { id: g.campusId, name: g.campus.name });
            }
        });
        setAvailableCampuses(Array.from(campusMap.values()));
        form.setValue('campusId', '');
    }, [selectedSchool, rawClassGroups, form]);

    useEffect(() => {
        if (!selectedCampus) { setAvailableGroups([]); return; }
        setAvailableGroups(rawClassGroups.filter(g => g.campusId === selectedCampus));
        form.setValue('classGroupId', '');
    }, [selectedCampus, rawClassGroups, form]);

    useEffect(() => {
        if (!selectedGroup) { setAvailableClasses([]); setAvailableStreams([]); return; }
        const group = rawClassGroups.find(g => g.id === selectedGroup);
        if (group) {
            setAvailableClasses(group.classes || []);
            setAvailableStreams(group.subjectGroups || []);
        }
        form.setValue('classId', '');
        form.setValue('subjectGroupId', '');
    }, [selectedGroup, rawClassGroups, form]);

    useEffect(() => {
        if (!selectedClass) { setAvailableSections([]); form.setValue('sectionId', ''); return; }
        fetch(`/api/classes/${selectedClass}/sections`).then(res => res.json()).then(setAvailableSections);
    }, [selectedClass, form]);

    useEffect(() => {
        if (!selectedClass) {
            setClassFeeItems([]);
            setSelectedFeeItems([]);
            return;
        }

        const loadFeeStructure = async () => {
            setIsLoadingFeeStructure(true);
            try {
                const res = await fetch(`/api/finance/fee-structures?classId=${selectedClass}`);
                if (!res.ok) {
                    setClassFeeItems([]);
                    setSelectedFeeItems([]);
                    return;
                }
                const structures = await res.json();
                const normalized = structures.map((item: any) => ({
                    feeHeadId: item.feeHeadId,
                    feeHeadName: item.feeHead?.name ?? 'Fee Head',
                    amount: String(Number(item.amount ?? 0)),
                }));
                setClassFeeItems(normalized);
                setSelectedFeeItems(normalized);
            } catch {
                toast.error('Failed to load class fee structure');
                setClassFeeItems([]);
                setSelectedFeeItems([]);
            } finally {
                setIsLoadingFeeStructure(false);
            }
        };

        loadFeeStructure();
    }, [selectedClass]);

    const updateFeeAmount = (feeHeadId: string, amount: string) => {
        setSelectedFeeItems((prev) =>
            prev.map((item) => (item.feeHeadId === feeHeadId ? { ...item, amount } : item))
        );
    };

    // ... (Keep Parent Search Logic) ...
    const handleSearchParent = async () => {
        if (!searchQuery || searchQuery.length < 3) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/parents/search?q=${searchQuery}`);
            if (res.ok) setSearchResults(await res.json());
        } finally { setIsSearching(false); }
    };

    const selectParent = (parent: any) => {
        setSelectedParent(parent);
        form.setValue('selectedParentId', parent.id);
        form.setValue('parentMode', 'LINK');
        // Auto-fill visuals only
        setSearchResults([]); 
    };

    const addOptionalParent = (relationship: 'MOTHER' | 'GUARDIAN') => {
        const exists = parentContacts.some((parent) => parent.relationship === relationship);
        if (exists) return;
        setParentContacts((prev) => [
            ...prev,
            {
                relationship,
                name: '',
                cnic: '',
                phone: '',
                occupation: '',
                email: '',
            },
        ]);
    };

    const removeOptionalParent = (relationship: 'MOTHER' | 'GUARDIAN') => {
        setParentContacts((prev) => prev.filter((parent) => parent.relationship !== relationship));
    };

    const updateParentContact = (
        relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN',
        field: keyof Omit<ParentContactDraft, 'relationship' | 'required'>,
        value: string
    ) => {
        setParentContacts((prev) =>
            prev.map((parent) =>
                parent.relationship === relationship ? { ...parent, [field]: value } : parent
            )
        );
    };

    const handlePhotoClick = () => {
        photoInputRef.current?.click();
    };

    const handlePhotoChange = (event: any) => {
        const file = event.target.files?.[0];
        setSelectedPhotoName(file?.name || '');
    };

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        form.clearErrors('email');
        try {
            // ... (Keep existing payload construction & API calls) ...
            const payload = {
                name: data.name, email: data.email, password: data.password, schoolId: data.schoolId,
                gender: data.gender, phone: data.phone, address: data.address,
                student: {
                    admissionNumber: data.admissionNumber, rollNumber: data.rollNumber || undefined,
                    admissionDate: data.admissionDate, classId: data.classId,
                    sectionId: data.sectionId || undefined, subjectGroupId: data.subjectGroupId || undefined,
                    academicYear: { startYear: data.startYear, stopYear: data.stopYear },
                    feeStructureItems: selectedFeeItems
                        .filter((item) => item.feeHeadId && item.amount !== '')
                        .map((item) => ({
                            feeHeadId: item.feeHeadId,
                            amount: Number(item.amount),
                        })),
                }
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const userResult = await res.json().catch(() => ({} as any));
            if (!res.ok) {
                if (res.status === 409 && (userResult?.field === 'email' || String(userResult?.error || '').toLowerCase().includes('email'))) {
                    form.setError('email', {
                        type: 'manual',
                        message: 'This email is already registered. Please use another email.',
                    });
                    throw new Error('Student email already exists');
                }
                if (res.status === 400 && Array.isArray(userResult?.errors)) {
                    userResult.errors.forEach((issue: any) => {
                        const field = issue?.path?.[0];
                        if (typeof field === 'string' && field in data) {
                            form.setError(field as keyof FormValues, {
                                type: 'manual',
                                message: issue.message || 'Invalid value',
                            });
                        }
                    });
                    throw new Error(userResult?.error || 'Please fix validation errors');
                }
                throw new Error(userResult?.error || 'Creation failed');
            }
            const studentUser = userResult;
            const studentRecordId = studentUser.studentRecord?.id;
            let hasParentIssue = false;

            if (data.parentMode === 'LINK' && data.selectedParentId) {
                const linkRes = await fetch(`/api/parents/${data.selectedParentId}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: studentRecordId, relationship: data.relationship }),
                });
                if (!linkRes.ok) {
                    hasParentIssue = true;
                }
            } else {
                const toCreate = parentContacts.filter((parent) => {
                    const hasValues = Boolean(
                        parent.name.trim() ||
                        parent.phone.trim() ||
                        parent.cnic.trim() ||
                        parent.occupation.trim() ||
                        parent.email.trim()
                    );
                    return parent.required || hasValues;
                });

                const father = toCreate.find((parent) => parent.relationship === 'FATHER');
                if (!father?.name.trim() || !father?.phone.trim() || !father?.cnic.trim()) {
                    throw new Error('Father name, phone and CNIC are required');
                }

                for (let i = 0; i < toCreate.length; i += 1) {
                    const parent = toCreate[i];
                    const generatedEmail = `${data.admissionNumber}-${parent.relationship.toLowerCase()}-${Date.now()}-${i}@school.local`;
                    const response = await fetch('/api/parents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: parent.name,
                            email: parent.email.trim() || generatedEmail,
                            password: 'password123',
                            phone: parent.phone,
                            address: data.address,
                            schoolId: data.schoolId,
                            occupation: parent.occupation,
                            cnic: parent.cnic,
                            studentId: studentRecordId,
                            relationship: parent.relationship,
                        }),
                    });

                    if (!response.ok) {
                        hasParentIssue = true;
                    }
                }
            }
            router.push('/students');
            router.refresh();
            if (hasParentIssue) {
                toast.warning('Student created, but one or more parent records could not be linked.');
            } else {
                toast.success('Student admission created successfully');
            }
        } catch (error) {
            console.error(error);
            form.setError('root', { message: 'Failed to create student' });
            toast.error(error instanceof Error ? error.message : 'Failed to create student admission');
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="w-full max-w-5xl flex flex-col gap-8 mx-auto py-8 px-4">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">New Student Admission</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base">Complete the form below to enroll a new student into the system.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()} className="bg-white dark:bg-slate-800 border-slate-200 text-slate-700">
                        Cancel
                    </Button>
                    <Button onClick={form.handleSubmit(onSubmit)} className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-blue-500/20">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Submit Admission
                    </Button>
                </div>
            </div>

            <Form {...form}>
                <form className="flex flex-col gap-6">
                    
                    {/* 1. School & Placement Card */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="text-primary bg-primary/10 p-1.5 rounded-lg">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">School & Class Placement</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="schoolId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">School Branch *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Campus Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedSchool}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableCampuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="classGroupId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Class Group</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCampus}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="classId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Class *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableClasses.length === 0}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="sectionId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Section</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableSections.length === 0}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="subjectGroupId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Stream (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableStreams.length === 0}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableStreams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="admissionNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Admission Number</FormLabel>
                                    <FormControl><Input {...field} className="bg-white" placeholder="Auto-generated or Enter" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="rollNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Roll Number</FormLabel>
                                    <FormControl><Input {...field} className="bg-white" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="startYear" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Session Start</FormLabel>
                                        <FormControl><Input {...field} className="bg-white" maxLength={4} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="stopYear" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Session End</FormLabel>
                                        <FormControl><Input {...field} className="bg-white" maxLength={4} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fee Structure Assignment</h3>
                            <p className="text-sm text-slate-500 mt-1">Class default fee structure is loaded here and you can edit amounts for this student.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {!selectedClass ? (
                                <p className="text-sm text-slate-500">Select a class to load fee structure.</p>
                            ) : isLoadingFeeStructure ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading fee structure...
                                </div>
                            ) : classFeeItems.length === 0 ? (
                                <p className="text-sm text-amber-600">No fee structure configured for this class yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-12 gap-2 text-xs font-bold uppercase text-slate-500 px-3">
                                        <span className="col-span-8">Fee Head</span>
                                        <span className="col-span-4 text-right">Amount</span>
                                    </div>
                                    {selectedFeeItems.map((item) => (
                                        <div key={item.feeHeadId} className="grid grid-cols-12 items-center gap-2 border rounded-lg px-3 py-2 bg-slate-50/50">
                                            <span className="col-span-8 text-sm font-medium text-slate-800">{item.feeHeadName}</span>
                                            <div className="col-span-4 flex items-center gap-2">
                                                <span className="text-sm text-slate-500">Rs.</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={item.amount}
                                                    onChange={(event) => updateFeeAmount(item.feeHeadId, event.target.value)}
                                                    className="bg-white text-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Personal Details Card */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 flex items-center gap-3">
                            <div className="text-purple-500 bg-purple-100 p-1.5 rounded-lg">
                                <User className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-6">
                            {/* Photo Placeholder */}
                            <div className="md:col-span-1 flex flex-col items-center justify-center gap-3">
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={handlePhotoClick}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handlePhotoClick();
                                        }
                                    }}
                                    className="size-32 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group"
                                >
                                    <Upload className="text-slate-400 group-hover:text-primary transition-colors h-8 w-8" />
                                    <span className="text-xs text-slate-400 font-medium mt-1 text-center px-1">
                                        {selectedPhotoName || 'Upload Photo'}
                                    </span>
                                </div>
                            </div>

                            <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-slate-700">Full Name *</FormLabel>
                                        <FormControl><Input {...field} className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <FormField control={form.control} name="gender" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Gender *</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 mt-2">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="MALE" id="male" className="text-primary" />
                                                    <Label htmlFor="male">Male</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="FEMALE" id="female" className="text-primary" />
                                                    <Label htmlFor="female">Female</Label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="admissionDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Date of Admission *</FormLabel>
                                        <FormControl><Input type="date" {...field} className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Email Address</FormLabel>
                                        <FormControl><Input type="email" {...field} className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Student Phone</FormLabel>
                                        <FormControl><Input {...field} className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-slate-700">Residential Address</FormLabel>
                                        <FormControl><Textarea {...field} className="bg-white" rows={2} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Student Password</FormLabel>
                                        <FormControl><Input type="password" {...field} className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Parent Information */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-green-600 bg-green-100 p-1.5 rounded-lg">
                                    <Users className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Parent / Guardian Information</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch 
                                    id="parent-link"
                                    checked={form.watch('parentMode') === 'LINK'}
                                    onCheckedChange={(checked) => {
                                        form.setValue('parentMode', checked ? 'LINK' : 'CREATE');
                                        if (!checked) {
                                            setSelectedParent(null);
                                            form.setValue('selectedParentId', '');
                                        }
                                    }} 
                                />
                                <Label htmlFor="parent-link" className="text-sm text-slate-600">Link Existing Parent?</Label>
                            </div>
                        </div>
                        <div className="p-6">
                            
                            {/* Search Box */}
                            {form.watch('parentMode') === 'LINK' && !selectedParent && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-4 items-center">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Search Parent by CNIC or Name..." 
                                            className="pl-10 bg-white border-slate-300"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button type="button" onClick={handleSearchParent} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : "Search"}
                                    </Button>
                                </div>
                            )}

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="mb-6 space-y-2">
                                    {searchResults.map((p) => (
                                        <div key={p.id} className="flex justify-between p-3 bg-white border rounded shadow-sm items-center">
                                            <div>
                                                <p className="font-bold">{p.user.name}</p>
                                                <p className="text-xs text-slate-500">{p.cnic}</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => selectParent(p)}>Select</Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected Parent */}
                            {selectedParent && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-green-800">{selectedParent.user.name}</p>
                                        <p className="text-sm text-green-600">CNIC: {selectedParent.cnic}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedParent(null)}><X className="h-4 w-4"/></Button>
                                </div>
                            )}

                            <div className="border-t border-slate-200 pt-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {form.watch('parentMode') === 'CREATE' && (
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-slate-600">Father is required. Mother and Guardian are optional.</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addOptionalParent('MOTHER')}
                                                    disabled={parentContacts.some((parent) => parent.relationship === 'MOTHER')}
                                                >
                                                    Add Mother
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addOptionalParent('GUARDIAN')}
                                                    disabled={parentContacts.some((parent) => parent.relationship === 'GUARDIAN')}
                                                >
                                                    Add Guardian
                                                </Button>
                                            </div>
                                        </div>

                                        {parentContacts.map((parent) => (
                                            <div key={parent.relationship} className="rounded-lg border border-slate-200 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-slate-800 capitalize">
                                                        {parent.relationship.toLowerCase()} {parent.required ? '(Required)' : '(Optional)'}
                                                    </h4>
                                                    {!parent.required && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeOptionalParent(parent.relationship as 'MOTHER' | 'GUARDIAN')}
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <FormItem>
                                                        <FormLabel className="text-slate-700">Name {parent.required ? '*' : ''}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="bg-white"
                                                                value={parent.name}
                                                                onChange={(event) => updateParentContact(parent.relationship, 'name', event.target.value)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                    <FormItem>
                                                        <FormLabel className="text-slate-700">CNIC {parent.required ? '*' : ''}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="bg-white"
                                                                placeholder="XXXXX-XXXXXXX-X"
                                                                value={parent.cnic}
                                                                onChange={(event) => updateParentContact(parent.relationship, 'cnic', event.target.value)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                    <FormItem>
                                                        <FormLabel className="text-slate-700">Contact Phone {parent.required ? '*' : ''}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="bg-white"
                                                                value={parent.phone}
                                                                onChange={(event) => updateParentContact(parent.relationship, 'phone', event.target.value)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                    <FormItem>
                                                        <FormLabel className="text-slate-700">Occupation</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="bg-white"
                                                                value={parent.occupation}
                                                                onChange={(event) => updateParentContact(parent.relationship, 'occupation', event.target.value)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                    <FormItem className="md:col-span-2">
                                                        <FormLabel className="text-slate-700">Email Address (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="bg-white"
                                                                value={parent.email}
                                                                onChange={(event) => updateParentContact(parent.relationship, 'email', event.target.value)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 pb-8">
                        <Button type="button" variant="outline" onClick={() => router.back()} className="bg-white border-slate-200">
                            Cancel
                        </Button>
                        <Button type="button" onClick={form.handleSubmit(onSubmit)} className="bg-primary hover:bg-primary/90 text-white shadow-md">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Submit Admission
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}