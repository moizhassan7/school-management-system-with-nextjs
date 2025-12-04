'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Search, UserCheck, UserPlus, X, Check, Building2, Users, Layers, BookOpen } from 'lucide-react';
import { format } from "date-fns";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// --- 1. Zod Validation Schema ---
const studentFormSchema = z.object({
    // User Account
    name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
    phone: z.string().optional(),
    address: z.string().optional(),
    
    // Hierarchy (Helpers for filtering)
    schoolId: z.string().min(1, 'School is required'),
    campusId: z.string().min(1, 'Campus is required'),
    classGroupId: z.string().min(1, 'Class Group is required'),
    
    // Academic Assignment
    classId: z.string().min(1, 'Class is required'),
    sectionId: z.string().optional(), // Optional initially
    subjectGroupId: z.string().optional(), // Optional (Student might not have a stream yet)
    
    // Student Specifics
    admissionNumber: z.string().min(1, 'Admission number is required'),
    rollNumber: z.string().optional(),
    admissionDate: z.string().min(1, 'Admission date is required'),
    
    // Session
    startYear: z.string().regex(/^\d{4}$/, 'Must be a 4-digit year'),
    stopYear: z.string().regex(/^\d{4}$/, 'Must be a 4-digit year'),

    // Parent Logic
    parentMode: z.enum(['LINK', 'CREATE']),
    selectedParentId: z.string().optional(),
    
    // New Parent Details
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional().or(z.literal('')),
    parentPhone: z.string().optional(),
    parentCnic: z.string().optional(),
    parentOccupation: z.string().optional(),
    relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
});

type FormValues = z.infer<typeof studentFormSchema>;

// --- 2. Types ---
interface School { id: string; name: string; }
interface Campus { id: string; name: string; schoolId: string; }
interface ClassGroup { 
    id: string; 
    name: string; 
    campusId: string;
    // Relations included in API response
    campus?: { schoolId: string; name: string };
    classes?: { id: string; name: string }[];
    subjectGroups?: { id: string; name: string }[];
}
interface Section { id: string; name: string; }

export default function StudentForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- 3. Data States ---
    const [schools, setSchools] = useState<School[]>([]);
    const [rawClassGroups, setRawClassGroups] = useState<ClassGroup[]>([]);
    
    // Filtered Options based on selection
    const [availableCampuses, setAvailableCampuses] = useState<Campus[]>([]);
    const [availableGroups, setAvailableGroups] = useState<ClassGroup[]>([]);
    const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([]);
    const [availableStreams, setAvailableStreams] = useState<{ id: string; name: string }[]>([]);
    const [availableSections, setAvailableSections] = useState<Section[]>([]);

    // Parent Search
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedParent, setSelectedParent] = useState<any>(null);

    // --- 4. Form Init ---
    const form = useForm<FormValues>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: {
            name: '', email: '', password: '', gender: 'UNSPECIFIED', phone: '', address: '',
            schoolId: '', campusId: '', classGroupId: '', classId: '', sectionId: '', subjectGroupId: '',
            admissionNumber: '', rollNumber: '', admissionDate: format(new Date(), 'yyyy-MM-dd'),
            startYear: new Date().getFullYear().toString(),
            stopYear: (new Date().getFullYear() + 1).toString(),
            parentMode: 'CREATE', relationship: 'FATHER',
            parentName: '', parentEmail: '', parentPhone: '', parentCnic: '', parentOccupation: ''
        },
    });

    // Watchers for Filtering
    const selectedSchool = form.watch('schoolId');
    const selectedCampus = form.watch('campusId');
    const selectedGroup = form.watch('classGroupId');
    const selectedClass = form.watch('classId');

    // --- 5. Logic & Effects ---

    // Load Initial Data (Schools & All Groups)
    useEffect(() => {
        const loadData = async () => {
            try {
                const [schoolRes, groupRes] = await Promise.all([
                    fetch('/api/schools'),
                    fetch('/api/class-groups') // This MUST return full hierarchy (classes, subjectGroups, campus)
                ]);
                if(schoolRes.ok) setSchools(await schoolRes.json());
                if(groupRes.ok) setRawClassGroups(await groupRes.json());
            } catch(e) { console.error("Data load failed", e); }
        };
        loadData();
    }, []);

    // Filter Campuses when School Changes
    useEffect(() => {
        if (!selectedSchool) {
            setAvailableCampuses([]);
            return;
        }
        // Extract unique campuses from the raw class groups that match the school
        // Or if you have a separate /campuses API, use that. 
        // Here we derive it from the classGroups data structure for efficiency if populated.
        // Assuming rawClassGroups includes `campus: { id, name, schoolId }`
        const campusMap = new Map();
        rawClassGroups.forEach(g => {
            if (g.campus && g.campus.schoolId === selectedSchool) {
                campusMap.set(g.campusId, { id: g.campusId, name: g.campus.name, schoolId: g.campus.schoolId });
            }
        });
        setAvailableCampuses(Array.from(campusMap.values()));
        
        // Reset downstream
        form.setValue('campusId', '');
    }, [selectedSchool, rawClassGroups, form]);

    // Filter Class Groups when Campus Changes
    useEffect(() => {
        if (!selectedCampus) {
            setAvailableGroups([]);
            return;
        }
        const groups = rawClassGroups.filter(g => g.campusId === selectedCampus);
        setAvailableGroups(groups);
        form.setValue('classGroupId', '');
    }, [selectedCampus, rawClassGroups, form]);

    // Filter Classes & Streams when Group Changes
    useEffect(() => {
        if (!selectedGroup) {
            setAvailableClasses([]);
            setAvailableStreams([]);
            return;
        }
        const group = rawClassGroups.find(g => g.id === selectedGroup);
        if (group) {
            setAvailableClasses(group.classes || []);
            setAvailableStreams(group.subjectGroups || []);
        }
        form.setValue('classId', '');
        form.setValue('subjectGroupId', '');
    }, [selectedGroup, rawClassGroups, form]);

    // Fetch Sections when Class Changes
    useEffect(() => {
        if (!selectedClass) {
            setAvailableSections([]);
            form.setValue('sectionId', '');
            return;
        }
        fetch(`/api/classes/${selectedClass}/sections`)
            .then(res => res.json())
            .then(setAvailableSections)
            .catch(console.error);
    }, [selectedClass, form]);


    // --- 6. Parent Logic ---
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
        form.setValue('selectedParentId', parent.id); // ParentRecord ID
        form.setValue('parentMode', 'LINK');
        setSearchResults([]); 
    };

    const clearParentSelection = () => {
        setSelectedParent(null);
        form.setValue('selectedParentId', '');
        form.setValue('parentMode', 'CREATE');
    };

    // --- 7. Submit Handler ---
    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            // Construct API Payload
            const payload = {
                name: data.name,
                email: data.email,
                password: data.password,
                schoolId: data.schoolId,
                gender: data.gender,
                phone: data.phone,
                address: data.address,
                student: {
                    admissionNumber: data.admissionNumber,
                    rollNumber: data.rollNumber || undefined, // NEW
                    admissionDate: data.admissionDate,
                    classId: data.classId,
                    sectionId: data.sectionId || undefined,
                    subjectGroupId: data.subjectGroupId || undefined, // NEW
                    academicYear: { startYear: data.startYear, stopYear: data.stopYear }
                }
            };

            // Create Student
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error((await res.json()).error || 'Creation failed');
            const studentUser = await res.json();
            const studentRecordId = studentUser.studentRecord?.id;

            // Handle Parent
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
            form.setError('root', { message: error instanceof Error ? error.message : 'Error occurred' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Global Error */}
                {form.formState.errors.root && (
                    <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md border border-destructive/20">
                        {form.formState.errors.root.message}
                    </div>
                )}

                {/* 1. ACADEMIC PLACEMENT (Hierarchy) */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            <CardTitle>School & Class Placement</CardTitle>
                        </div>
                        <CardDescription>Assign the student to their campus and class level.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* School & Campus */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="schoolId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>School</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger></FormControl>
                                        <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Campus</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedSchool}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableCampuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <Separator />

                        {/* Class Group & Details */}
                        <div className="grid md:grid-cols-4 gap-4">
                            <FormField control={form.control} name="classGroupId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Class Group</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCampus}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="e.g. Middle Section" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="classId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Class</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableClasses.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="e.g. 9th" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="sectionId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Section</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableSections.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="e.g. Blue" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="subjectGroupId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stream (Subject Group)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableStreams.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="e.g. Science" /></SelectTrigger></FormControl>
                                        <SelectContent>{availableStreams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormDescription className="text-[10px]">Optional for junior classes</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Session & Identifiers */}
                        <div className="grid md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                            <FormField control={form.control} name="admissionNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Admission #</FormLabel>
                                    <FormControl><Input placeholder="ADM-001" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <FormField control={form.control} name="rollNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Roll No</FormLabel>
                                    <FormControl><Input placeholder="01" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="startYear" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Session Start</FormLabel>
                                    <FormControl><Input maxLength={4} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="stopYear" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Session End</FormLabel>
                                    <FormControl><Input maxLength={4} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. PERSONAL INFO */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            <CardTitle>Personal Details</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MALE">Male</SelectItem>
                                        <SelectItem value="FEMALE">Female</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="admissionDate" render={({ field }) => (
                            <FormItem><FormLabel>Admission Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                {/* 3. PARENT / GUARDIAN */}
                <Card className="border-indigo-100 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-indigo-600" />
                                <CardTitle>Parent Information</CardTitle>
                            </div>
                            {selectedParent && <Badge variant="secondary" className="bg-green-100 text-green-700">Existing Parent Linked</Badge>}
                        </div>
                        <CardDescription>Link to an existing parent (siblings) or register a new one.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        {/* Search Area */}
                        {!selectedParent && (
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <FormLabel className="mb-2 block font-semibold text-slate-700">Link Existing Parent</FormLabel>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Search by CNIC, Email or Phone..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-white"
                                    />
                                    <Button type="button" onClick={handleSearchParent} disabled={isSearching}>
                                        {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {searchResults.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm hover:border-indigo-300 transition-colors">
                                                <div>
                                                    <p className="font-medium text-slate-900">{p.user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{p.cnic || 'No CNIC'} • {p.user.phone}</p>
                                                </div>
                                                <Button size="sm" variant="outline" type="button" onClick={() => selectParent(p)}>
                                                    <UserCheck className="h-4 w-4 mr-2 text-green-600" /> Select
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected Parent View */}
                        {selectedParent && (
                            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-full"><UserCheck className="h-5 w-5 text-green-700" /></div>
                                    <div>
                                        <p className="font-bold text-green-800">{selectedParent.user.name}</p>
                                        <p className="text-sm text-green-600">CNIC: {selectedParent.cnic}</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" type="button" onClick={clearParentSelection}>
                                    <X className="h-4 w-4 mr-2" /> Change
                                </Button>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="relationship" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Relationship to Student</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="FATHER">Father</SelectItem>
                                            <SelectItem value="MOTHER">Mother</SelectItem>
                                            <SelectItem value="GUARDIAN">Guardian</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Create New Parent Fields */}
                        {!selectedParent && (
                            <div className="animate-in fade-in slide-in-from-top-4 space-y-4 pt-4 border-t">
                                <h4 className="font-semibold text-sm text-indigo-600 uppercase tracking-wide">New Parent Details</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="parentName" render={({ field }) => (
                                        <FormItem><FormLabel>Parent Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="parentCnic" render={({ field }) => (
                                        <FormItem><FormLabel>CNIC</FormLabel><FormControl><Input placeholder="00000-0000000-0" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="parentPhone" render={({ field }) => (
                                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="parentOccupation" render={({ field }) => (
                                        <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="parentEmail" render={({ field }) => (
                                        <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-white p-4 border-t z-10">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                            </>
                        ) : (
                            'Complete Admission'
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}