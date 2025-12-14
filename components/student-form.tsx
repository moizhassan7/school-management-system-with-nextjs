'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Loader2, Search, Save, X, Building2, User, Users, Calendar, 
    Phone, Mail, MapPin, Check, Upload, GraduationCap, Briefcase 
} from 'lucide-react';
import { format } from "date-fns";

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

export default function StudentForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            // ... (Keep existing payload construction & API calls) ...
            const payload = {
                name: data.name, email: data.email, password: data.password, schoolId: data.schoolId,
                gender: data.gender, phone: data.phone, address: data.address,
                student: {
                    admissionNumber: data.admissionNumber, rollNumber: data.rollNumber || undefined,
                    admissionDate: data.admissionDate, classId: data.classId,
                    sectionId: data.sectionId || undefined, subjectGroupId: data.subjectGroupId || undefined,
                    academicYear: { startYear: data.startYear, stopYear: data.stopYear }
                }
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Creation failed');
            const studentUser = await res.json();
            const studentRecordId = studentUser.studentRecord?.id;

            if (data.parentMode === 'LINK' && data.selectedParentId) {
                await fetch(`/api/parents/${data.selectedParentId}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: studentRecordId, relationship: data.relationship }),
                });
            } else {
                await fetch('/api/parents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: data.parentName, email: data.parentEmail, password: 'password123',
                        phone: data.parentPhone, address: data.address, schoolId: data.schoolId,
                        occupation: data.parentOccupation, cnic: data.parentCnic,
                        studentId: studentRecordId, relationship: data.relationship
                    }),
                });
            }
            router.push('/students');
            router.refresh();
        } catch (error) {
            console.error(error);
            form.setError('root', { message: 'Failed to create student' });
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
                                <div className="size-32 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group">
                                    <Upload className="text-slate-400 group-hover:text-primary transition-colors h-8 w-8" />
                                    <span className="text-xs text-slate-400 font-medium mt-1">Upload Photo</span>
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
                                    onCheckedChange={(c) => form.setValue('parentMode', c ? 'LINK' : 'CREATE')} 
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
                                <FormField control={form.control} name="relationship" render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-slate-700">Relationship *</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 mt-2">
                                                {['FATHER', 'MOTHER', 'GUARDIAN'].map(r => (
                                                    <div key={r} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={r} id={r} className="text-primary" />
                                                        <Label htmlFor={r} className="capitalize">{r.toLowerCase()}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )} />

                                {form.watch('parentMode') === 'CREATE' && !selectedParent && (
                                    <>
                                        <FormField control={form.control} name="parentName" render={({ field }) => (
                                            <FormItem><FormLabel className="text-slate-700">Parent Name *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="parentCnic" render={({ field }) => (
                                            <FormItem><FormLabel className="text-slate-700">CNIC Number *</FormLabel><FormControl><Input {...field} className="bg-white" placeholder="XXXXX-XXXXXXX-X" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="parentPhone" render={({ field }) => (
                                            <FormItem><FormLabel className="text-slate-700">Contact Phone *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="parentOccupation" render={({ field }) => (
                                            <FormItem><FormLabel className="text-slate-700">Occupation</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="parentEmail" render={({ field }) => (
                                            <FormItem><FormLabel className="text-slate-700">Email Address (Optional)</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </>
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