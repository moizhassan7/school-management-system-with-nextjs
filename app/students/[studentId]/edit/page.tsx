'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentEditForm from '@/components/student-edit-form';

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/students/${studentId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Student not found');
        return data;
      })
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Loading student...
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="page-content flex flex-col items-center gap-4 py-16">
        <p className="text-destructive">{error || 'Student not found'}</p>
        <Link href="/students">
          <Button variant="outline">Back to Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/students/${studentId}`}>
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Edit Student
          </h1>
          <p className="mt-1 text-muted-foreground">
            Update details for {student.name}
            {student.studentRecord?.admissionNumber
              ? ` · ${student.studentRecord.admissionNumber}`
              : ''}
          </p>
        </div>
      </div>

      <StudentEditForm studentId={studentId} initialData={student} />
    </div>
  );
}
