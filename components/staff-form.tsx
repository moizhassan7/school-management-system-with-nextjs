'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, User, Briefcase, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetch('/api/subjects').then(res => res.json()).then((data) => setSubjects(Array.isArray(data) ? data : []));
    fetch('/api/classes').then(res => res.json()).then((data) => setClasses(Array.isArray(data) ? data : []));
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
    const list = Array.isArray(data) ? data : [];
    setSectionsByClass(prev => ({ ...prev, [classId]: list }));
    return list;
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
      const payload = { ...values, assignments };
      const endpoint = staffId ? `/api/staff/${staffId}` : '/api/staff';
      const method = staffId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(staffId ? 'Staff updated' : 'Staff created');
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({} as any));
        toast.error(err?.error || "Failed to save staff");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="bento-tile overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-5 py-4">
            <div className="rounded-xl bg-primary/10 p-1.5 text-primary">
              <User className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <div className="bento-tile overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-5 py-4">
            <div className="rounded-xl bg-secondary p-1.5 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Professional Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>System Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
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
              <FormItem><FormLabel>Designation</FormLabel><FormControl><Input className="rounded-xl" placeholder="e.g. Senior Teacher" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="salary" render={({ field }) => (
              <FormItem><FormLabel>Salary (Rs.)</FormLabel><FormControl><Input type="number" className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="joiningDate" render={({ field }) => (
              <FormItem><FormLabel>Joining Date</FormLabel><FormControl><Input type="date" className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="employmentType" render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="department" render={({ field }) => (
              <FormItem><FormLabel>Department</FormLabel><FormControl><Input className="rounded-xl" placeholder="e.g. Science" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="qualification" render={({ field }) => (
              <FormItem><FormLabel>Qualification</FormLabel><FormControl><Input className="rounded-xl" placeholder="e.g. M.Sc. Physics" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        {form.watch('role') === 'TEACHER' && (
          <div className="bento-tile overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-5 py-4">
              <div className="rounded-xl bg-accent p-1.5 text-cta">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Teacher Assignments</h2>
            </div>
            <div className="space-y-4 p-5">
              {assignments.map((assign, idx) => (
                <div key={idx} className="flex flex-col items-end gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 sm:flex-row">
                  <div className="w-full flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
                    <Select value={assign.subjectId || undefined} onValueChange={(v) => updateAssignment(idx, 'subjectId', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Class</label>
                    <Select value={assign.classId || undefined} onValueChange={(v) => updateAssignment(idx, 'classId', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Section</label>
                    <Select value={assign.sectionId || undefined} onValueChange={(v) => updateAssignment(idx, 'sectionId', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Section" /></SelectTrigger>
                      <SelectContent>
                        {(sectionsByClass[assign.classId] || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeAssignment(idx)} className="cursor-pointer text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addAssignment} className="w-full cursor-pointer border-dashed">
                <Plus className="mr-2 h-4 w-4" /> Add Subject Assignment
              </Button>

              <div>
                <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Class Incharge</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Class</label>
                    <Select value={inchargeClassId || undefined} onValueChange={async (v) => {
                      setInchargeClassId(v);
                      const secs = await fetchSectionsForClass(v);
                      setInchargeSections(secs);
                      form.setValue('inchargeSectionId', undefined);
                    }}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Section</label>
                    <Select value={form.watch('inchargeSectionId') || undefined} onValueChange={(v) => form.setValue('inchargeSectionId', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Section" /></SelectTrigger>
                      <SelectContent>
                        {inchargeSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pb-4">
          <Button type="submit" disabled={isSubmitting} className="cursor-pointer font-semibold shadow-md shadow-primary/20">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Staff Member
          </Button>
        </div>
      </form>
    </Form>
  );
}
