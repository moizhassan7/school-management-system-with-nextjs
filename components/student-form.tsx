'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Search, UserCheck, UserPlus, X, Check, ChevronsUpDown } from 'lucide-react';
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

// --- Zod Schema ---
const studentFormSchema = z.object({
    // 1. User General Info
    name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
    phone: z.string().optional(),
    address: z.string().optional(),
    schoolId: z.string().min(1, 'School is required'),

    // 2. Student Record Info
    admissionNumber: z.string().min(1, 'Admission number is required'),
    admissionDate: z.string().min(1, 'Admission date is required'),
    
    // 3. Placement (Hierarchy)
    classGroupId: z.string().min(1, 'Class Group is required'),
    classId: z.string().min(1, 'Class is required'),
    sectionId: z.string().optional(), // Optional, as a class might not have sections yet

    // 4. Academic Session
    startYear: z.string().regex(/^\d{4}$/, 'Must be a 4-digit year'),
    stopYear: z.string().regex(/^\d{4}$/, 'Must be a 4-digit year'),

    // 5. Parent Logic
    parentMode: z.enum(['LINK', 'CREATE']),
    selectedParentId: z.string().optional(),
    
    // 6. New Parent Details (Used only if parentMode === 'CREATE')
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional().or(z.literal('')),
    parentPhone: z.string().optional(),
    parentCnic: z.string().optional(),
    parentOccupation: z.string().optional(),
    relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
});

type FormValues = z.infer<typeof studentFormSchema>;

// --- Interfaces ---
interface SchoolOption { id: string; name: string; }
interface ClassGroupOption { 
    id: string; 
    name: string; 
    subjectGroups: { classes: { id: string; name: string }[] }[] 
}
interface ClassOption { id: string; name: string; classGroupId: string; }
interface SectionOption { id: string; name: string; }

export default function StudentForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data States ---
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroupOption[]>([]);
    const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
    const [filteredClasses, setFilteredClasses] = useState<ClassOption[]>([]);
    const [sections, setSections] = useState<SectionOption[]>([]);

    // --- Parent Search States ---
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedParent, setSelectedParent] = useState<any>(null);

    // --- Form Initialization ---
    const form = useForm<FormValues>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: {
            name: '', email: '', password: '', gender: 'UNSPECIFIED',
            phone: '', address: '', schoolId: '',
            admissionNumber: '', admissionDate: format(new Date(), 'yyyy-MM-dd'),
            classGroupId: '', classId: '', sectionId: '',
            startYear: new Date().getFullYear().toString(),
            stopYear: (new Date().getFullYear() + 1).toString(),
            parentMode: 'CREATE',
            relationship: 'FATHER',
            parentName: '', parentEmail: '', parentPhone: '', parentCnic: '', parentOccupation: ''
        },
    });

    // --- Watchers for Hierarchy ---
    const selectedClassGroup = form.watch('classGroupId');
    const selectedClass = form.watch('classId');

    // --- Effects ---

    // 1. Initial Data Fetch
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [schoolsRes, groupsRes] = await Promise.all([
                    fetch('/api/schools'),
                    fetch('/api/class-groups')
                ]);
                
                if (schoolsRes.ok) setSchools(await schoolsRes.json());
                
                if (groupsRes.ok) {
                    const groupsData: ClassGroupOption[] = await groupsRes.json();
                    setClassGroups(groupsData);
                    
                    // Flatten classes for easier filtering
                    const flatClasses: ClassOption[] = [];
                    groupsData.forEach(g => {
                        g.subjectGroups.forEach(sg => {
                            sg.classes.forEach(c => {
                                flatClasses.push({ id: c.id, name: c.name, classGroupId: g.id });
                            });
                        });
                    });
                    setAllClasses(flatClasses);
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };
        loadInitialData();
    }, []);

    // 2. Filter Classes when Class Group changes
    useEffect(() => {
        if (selectedClassGroup) {
            const filtered = allClasses.filter(c => c.classGroupId === selectedClassGroup);
            setFilteredClasses(filtered);
            // Reset dependent fields
            if (!filtered.find(c => c.id === form.getValues('classId'))) {
                form.setValue('classId', '');
                form.setValue('sectionId', '');
            }
        } else {
            setFilteredClasses([]);
        }
    }, [selectedClassGroup, allClasses, form]);

    // 3. Fetch Sections when Class changes
    useEffect(() => {
        const fetchSections = async () => {
            if (!selectedClass) {
                setSections([]);
                return;
            }
            try {
                const res = await fetch(`/api/classes/${selectedClass}/sections`);
                if (res.ok) {
                    setSections(await res.json());
                }
            } catch (error) {
                console.error("Failed to load sections", error);
            }
        };
        fetchSections();
    }, [selectedClass]);

    // --- Parent Search Logic ---
    const handleSearchParent = async () => {
        if (!searchQuery || searchQuery.length < 3) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/parents/search?q=${searchQuery}`);
            if (res.ok) {
                setSearchResults(await res.json());
            }
        } finally {
            setIsSearching(false);
        }
    };

    const selectParent = (parent: any) => {
        setSelectedParent(parent);
        form.setValue('selectedParentId', parent.parentRecord.id); // Assuming the search returns parentRecord.id logic
        form.setValue('parentMode', 'LINK');
        setSearchResults([]); 
    };

    const clearParentSelection = () => {
        setSelectedParent(null);
        form.setValue('selectedParentId', '');
        form.setValue('parentMode', 'CREATE');
    };

    // --- Submit Logic ---
    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            // Step 1: Create the Student (User + StudentRecord)
            const studentPayload = {
                name: data.name,
                email: data.email,
                password: data.password,
                schoolId: data.schoolId,
                gender: data.gender,
                phone: data.phone,
                address: data.address,
                student: {
                    admissionNumber: data.admissionNumber,
                    admissionDate: data.admissionDate,
                    classId: data.classId,
                    sectionId: data.sectionId || undefined,
                    academicYear: { 
                        startYear: data.startYear, 
                        stopYear: data.stopYear 
                    }
                }
            };

            const studentRes = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentPayload),
            });

            if (!studentRes.ok) {
                const err = await studentRes.json();
                throw new Error(err.error || 'Failed to create student');
            }

            const newStudent = await studentRes.json();
            // Important: We need the ID of the created StudentRecord, not just the User ID.
            // The /api/users route should ideally return the included studentRecord.
            // Assuming your backend returns the user object with the relation, 
            // you might need to fetch the student record ID differently if not returned.
            // For this code, let's assume the API was updated or returns { ...user, studentRecord: { id: ... } }
            // If strictly using your current API, you might need a secondary lookup if the ID isn't in the response.
            // *Correction*: Your User POST route returns the user object. Prisma create include logic is needed there.
            // Let's assume we get `newStudent.studentRecord.id`.
            
            // If the response doesn't have it, we might fail here. 
            // *Quick Fix Recommendation*: Ensure /api/users POST includes `studentRecord: true` in the response.
            const studentRecordId = newStudent.studentRecord?.id; 

            if (!studentRecordId) throw new Error("Created user but failed to retrieve student ID");

            // Step 2: Handle Parent Association
            if (data.parentMode === 'LINK' && data.selectedParentId) {
                // Link to existing parent
                await fetch(`/api/parents/${data.selectedParentId}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: studentRecordId,
                        relationship: data.relationship
                    }),
                });
            } else {
                // Create new parent and link
                await fetch('/api/parents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: data.parentName,
                        email: data.parentEmail,
                        password: 'password123', // Default or generated
                        phone: data.parentPhone,
                        address: data.address, // Inherit address
                        schoolId: data.schoolId,
                        occupation: data.parentOccupation,
                        cnic: data.parentCnic,
                        studentId: studentRecordId, // Link immediately
                        relationship: data.relationship
                    }),
                });
            }

            router.push('/students');
            router.refresh();
        } catch (error) {
            console.error(error);
            form.setError('root', { message: error instanceof Error ? error.message : 'An error occurred' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Global Error */}
                {form.formState.errors.root && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                        {form.formState.errors.root.message}
                    </div>
                )}

                {/* 1. STUDENT PERSONAL INFO */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Basic details for the student account.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="MALE">Male</SelectItem>
                                        <SelectItem value="FEMALE">Female</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                        <SelectItem value="UNSPECIFIED">Unspecified</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input type="email" placeholder="student@school.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl><Input type="password" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone (Optional)</FormLabel>
                                <FormControl><Input placeholder="+1 234..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Address (Optional)</FormLabel>
                                <FormControl><Input placeholder="123 St..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                {/* 2. ACADEMIC & PLACEMENT */}
                <Card>
                    <CardHeader>
                        <CardTitle>Academic Placement</CardTitle>
                        <CardDescription>Enrollment details and class assignment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FormField control={form.control} name="schoolId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>School</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {schools.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="admissionNumber" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admission No</FormLabel>
                                        <FormControl><Input placeholder="ADM-001" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <FormField control={form.control} name="admissionDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admission Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid gap-6 md:grid-cols-3">
                            <FormField control={form.control} name="classGroupId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Class Group</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {classGroups.map(cg => (
                                                <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="classId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Class</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClassGroup}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {filteredClasses.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="sectionId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Section</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClass || sections.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={sections.length === 0 ? "No Sections" : "Select Section"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {sections.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 bg-slate-50 p-4 rounded-md border">
                            <FormField control={form.control} name="startYear" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Session Start Year</FormLabel>
                                    <FormControl><Input {...field} maxLength={4} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="stopYear" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Session End Year</FormLabel>
                                    <FormControl><Input {...field} maxLength={4} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. PARENT / GUARDIAN */}
                <Card className="border-blue-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-blue-900">
                            Parent / Guardian
                            {selectedParent && <Badge variant="secondary" className="bg-blue-100 text-blue-700">Linked</Badge>}
                        </CardTitle>
                        <CardDescription>Link an existing parent or add a new one.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        {/* Search existing parent */}
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
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm hover:border-blue-300 transition-colors">
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

                        {/* Selected Parent Display */}
                        {selectedParent && (
                            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <UserCheck className="h-5 w-5 text-green-700" />
                                    </div>
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

                        <Separator />

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
                            <div className="animate-in fade-in slide-in-from-top-4 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserPlus className="h-4 w-4 text-blue-600" />
                                    <h4 className="font-semibold text-sm text-blue-600 uppercase tracking-wide">New Parent Details</h4>
                                </div>
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

                <div className="flex justify-end gap-4 pt-4">
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