'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Building2, User } from 'lucide-react';
import { format } from 'date-fns';
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
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const editSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
  phone: z.string().optional(),
  address: z.string().optional(),
  religion: z.string().optional(),
  schoolId: z.string().min(1, 'School is required'),
  campusId: z.string().min(1, 'Campus is required'),
  classGroupId: z.string().min(1, 'Class Group is required'),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().optional(),
  subjectGroupId: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionDate: z.string().min(1, 'Admission date is required'),
});

type FormValues = z.infer<typeof editSchema>;

interface StudentEditFormProps {
  studentId: string;
  initialData: any;
}

export default function StudentEditForm({ studentId, initialData }: StudentEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [rawClassGroups, setRawClassGroups] = useState<any[]>([]);
  const [availableCampuses, setAvailableCampuses] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableStreams, setAvailableStreams] = useState<any[]>([]);
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const record = initialData.studentRecord;
  const admissionNumber = record?.admissionNumber || '—';

  const form = useForm<FormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: initialData.name || '',
      email: initialData.email || '',
      password: '',
      gender: initialData.gender || 'UNSPECIFIED',
      phone: initialData.phone || '',
      address: initialData.address || '',
      religion: initialData.religion || '',
      schoolId: initialData.schoolId || '',
      campusId: record?.myClass?.classGroup?.campusId || '',
      classGroupId: record?.myClass?.classGroupId || '',
      classId: record?.classId || '',
      sectionId: record?.sectionId || '',
      subjectGroupId: record?.subjectGroupId || '',
      rollNumber: record?.rollNumber || '',
      admissionDate: record?.admissionDate
        ? format(new Date(record.admissionDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const selectedSchool = form.watch('schoolId');
  const selectedCampus = form.watch('campusId');
  const selectedGroup = form.watch('classGroupId');
  const selectedClass = form.watch('classId');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schoolRes, groupRes] = await Promise.all([
          fetch('/api/schools'),
          fetch('/api/class-groups'),
        ]);
        if (schoolRes.ok) setSchools(await schoolRes.json());
        if (groupRes.ok) setRawClassGroups(await groupRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setHydrated(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!hydrated || !selectedSchool) {
      setAvailableCampuses([]);
      return;
    }
    const campusMap = new Map();
    rawClassGroups.forEach((g) => {
      if (g.campus && g.campus.schoolId === selectedSchool) {
        campusMap.set(g.campusId, { id: g.campusId, name: g.campus.name });
      }
    });
    setAvailableCampuses(Array.from(campusMap.values()));
  }, [selectedSchool, rawClassGroups, hydrated]);

  useEffect(() => {
    if (!hydrated || !selectedCampus) {
      setAvailableGroups([]);
      return;
    }
    setAvailableGroups(rawClassGroups.filter((g) => g.campusId === selectedCampus));
  }, [selectedCampus, rawClassGroups, hydrated]);

  useEffect(() => {
    if (!hydrated || !selectedGroup) {
      setAvailableClasses([]);
      setAvailableStreams([]);
      return;
    }
    const group = rawClassGroups.find((g) => g.id === selectedGroup);
    if (group) {
      setAvailableClasses(group.classes || []);
      setAvailableStreams(group.subjectGroups || []);
    }
  }, [selectedGroup, rawClassGroups, hydrated]);

  useEffect(() => {
    if (!hydrated || !selectedClass) {
      setAvailableSections([]);
      return;
    }
    fetch(`/api/classes/${selectedClass}/sections`)
      .then((res) => res.json())
      .then((data) => setAvailableSections(Array.isArray(data) ? data : []));
  }, [selectedClass, hydrated]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        gender: data.gender,
        phone: data.phone || null,
        address: data.address || null,
        religion: data.religion || null,
        schoolId: data.schoolId,
        classId: data.classId,
        sectionId: data.sectionId || null,
        subjectGroupId: data.subjectGroupId || null,
        rollNumber: data.rollNumber || null,
        admissionDate: data.admissionDate,
      };
      if (data.password && data.password.length >= 6) {
        payload.password = data.password;
      }

      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (result.field === 'email') {
          form.setError('email', { message: 'This email is already registered' });
        }
        throw new Error(result.error || 'Failed to update student');
      }

      toast.success('Student profile updated');
      router.push(`/students/${studentId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* 1. Student Details */}
        <div className="bento-tile overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-5 py-4">
            <div className="rounded-xl bg-primary/10 p-1.5 text-primary">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Student Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="mt-2 flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MALE" id="edit-male" />
                        <Label htmlFor="edit-male">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="FEMALE" id="edit-female" />
                        <Label htmlFor="edit-female">Female</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="admissionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Admission *</FormLabel>
                  <FormControl>
                    <Input type="date" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Phone</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Religion</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Christianity">Christianity</SelectItem>
                      <SelectItem value="Hinduism">Hinduism</SelectItem>
                      <SelectItem value="Sikhism">Sikhism</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Residential Address</FormLabel>
                  <FormControl>
                    <Textarea className="rounded-xl" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      className="rounded-xl"
                      placeholder="Leave blank to keep current"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 2. School & Class Placement */}
        <div className="bento-tile overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-5 py-4">
            <div className="rounded-xl bg-primary/10 p-1.5 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              School & Class Placement
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <FormItem>
              <FormLabel>Admission Number</FormLabel>
              <FormControl>
                <Input className="rounded-xl bg-muted/60" value={admissionNumber} disabled readOnly />
              </FormControl>
              <p className="text-xs text-muted-foreground">Assigned by server — cannot change</p>
            </FormItem>

            <FormField
              control={form.control}
              name="schoolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Branch *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('campusId', '');
                      form.setValue('classGroupId', '');
                      form.setValue('classId', '');
                      form.setValue('sectionId', '');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="campusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campus *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('classGroupId', '');
                      form.setValue('classId', '');
                      form.setValue('sectionId', '');
                    }}
                    value={field.value}
                    disabled={!selectedSchool}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCampuses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Group *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('classId', '');
                      form.setValue('sectionId', '');
                      form.setValue('subjectGroupId', '');
                    }}
                    value={field.value}
                    disabled={!selectedCampus}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('sectionId', '');
                    }}
                    value={field.value}
                    disabled={availableClasses.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={availableSections.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={availableStreams.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStreams.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rollNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-4">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer rounded-xl"
            onClick={() => router.push(`/students/${studentId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-xl font-semibold shadow-md shadow-primary/20"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
