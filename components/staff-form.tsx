'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Define schema matching the API
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(['TEACHER', 'STAFF', 'ACCOUNTANT', 'ADMIN']),
  designation: z.string().min(1),
  department: z.string().optional(),
  qualification: z.string().optional(),
  joiningDate: z.string(),
  salary: z.coerce.number().min(0),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  assignments: z.array(z.object({
    subjectId: z.string(),
    classId: z.string(),
    sectionId: z.string().optional(),
  })).optional(),
  inchargeSectionId: z.string().optional(),
});

export default function StaffForm({ onSuccess, initialData, staffId }: { onSuccess: () => void; initialData?: any; staffId?: string }) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, any[]>>({});
  const [inchargeClassId, setInchargeClassId] = useState<string>('');
  const [inchargeSections, setInchargeSections] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment State
  const [assignments, setAssignments] = useState<{ subjectId: string, classId: string, sectionId?: string }[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      role: (initialData?.user?.role as "TEACHER" | "STAFF" | "ACCOUNTANT" | "ADMIN") || 'TEACHER',
      employmentType: (initialData?.employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN") || 'FULL_TIME',
      joiningDate: initialData?.joiningDate ? String(initialData.joiningDate).slice(0, 10) : new Date().toISOString().split('T')[0],
      assignments: [],
      name: initialData?.user?.name || '',
      email: initialData?.user?.email || '',
      password: '',
      phone: initialData?.user?.phone || '',
      designation: initialData?.designation || '',
      department: initialData?.department || '',
      qualification: initialData?.qualification || '',
      salary: initialData?.salary ? Number(initialData.salary) : 0,
      inchargeSectionId: initialData?.sectionsIncharged?.[0]?.id || ''
    }
  });

  // Load Data
  useEffect(() => {
    fetch('/api/subjects').then(res => res.json()).then(setSubjects);
    fetch('/api/classes').then(res => res.json()).then(setClasses); // Ensure this API returns all classes
  }, []);

  useEffect(() => {
    if (initialData?.assignments?.length) {
      const arr = initialData.assignments.map((a: any) => ({
        subjectId: a.subjectId,
        classId: a.classId,
        sectionId: a.sectionId || ''
      }));
      setAssignments(arr);
      const uniq = Array.from(new Set(arr.map((a: any) => a.classId)));
      Promise.all(uniq.map(cid => fetchSectionsForClass(cid as string))).then(() => { });
    }
    if (initialData?.sectionsIncharged?.length) {
      const s = initialData.sectionsIncharged[0];
      setInchargeClassId(s.classId);
      fetchSectionsForClass(s.classId).then(secs => setInchargeSections(secs));
      form.setValue('inchargeSectionId', s.id);
    }
  }, [initialData]);

  const fetchSectionsForClass = async (classId: string) => {
    if (!classId) return [];
    const res = await fetch(`/api/classes/${classId}/sections`);
    const data = await res.json();
    setSectionsByClass(prev => ({ ...prev, [classId]: data || [] }));
    return data || [];
  };

  const addAssignment = () => {
    setAssignments([...assignments, { subjectId: '', classId: '', sectionId: '' }]);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: string, value: string) => {
    const newAssignments = [...assignments];
    // @ts-ignore
    newAssignments[index][field] = value;
    setAssignments(newAssignments);
    if (field === 'classId' && value) {
      fetchSectionsForClass(value);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = { ...values, assignments }; // Merge manual assignments state

      const endpoint = staffId ? `/api/staff/${staffId}` : '/api/staff';
      const method = staffId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({} as any));
        toast.error(err?.error || "Failed to create staff");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-xl font-bold">Add New Staff / Teacher</h2>

        {/* Personal Info */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <Separator />

        {/* Professional Info */}
        <div className="grid grid-cols-3 gap-4">
          <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
              <FormLabel>System Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="STAFF">Support Staff</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="designation" render={({ field }) => (
            <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="e.g. Senior Teacher" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="salary" render={({ field }) => (
            <FormItem><FormLabel>Salary</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="joiningDate" render={({ field }) => (
            <FormItem><FormLabel>Joining Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="employmentType" render={({ field }) => (
            <FormItem>
              <FormLabel>Employment Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="department" render={({ field }) => (
            <FormItem><FormLabel>Department</FormLabel><FormControl><Input placeholder="e.g. Science" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="qualification" render={({ field }) => (
            <FormItem><FormLabel>Academics</FormLabel><FormControl><Input placeholder="e.g. M.Sc. Physics" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* Teacher Specifics */}
        {form.watch('role') === 'TEACHER' && (
          <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
            <h3 className="font-semibold flex items-center gap-2">Teacher Assignments</h3>

            {/* Assignments List */}
            {assignments.map((assign, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs">Subject</label>
                  <Select onValueChange={(v) => updateAssignment(idx, 'subjectId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-xs">Class</label>
                  <Select onValueChange={async (v) => {
                    updateAssignment(idx, 'classId', v);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-xs">Section</label>
                  <Select onValueChange={(v) => updateAssignment(idx, 'sectionId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                    <SelectContent>
                      {(sectionsByClass[assign.classId] || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeAssignment(idx)} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addAssignment} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" /> Add Subject Assignment
            </Button>

            <h3 className="font-semibold">Class Incharge</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs">Class</label>
                <Select onValueChange={async (v) => {
                  setInchargeClassId(v);
                  const secs = await fetchSectionsForClass(v);
                  setInchargeSections(secs);
                  form.setValue('inchargeSectionId', undefined);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs">Section</label>
                <Select onValueChange={(v) => form.setValue('inchargeSectionId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                  <SelectContent>
                    {inchargeSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Staff Member
          </Button>
        </div>
      </form>
    </Form>
  );
}
