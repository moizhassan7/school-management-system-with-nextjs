'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

interface Child {
  id: string;
  relationship: string;
  studentRecord: {
    admissionNumber: string | null;
    user: { name: string; email: string; id?: string };
    myClass: { name: string } | null;
    section?: { name: string } | null;
  };
}

export default function ParentDashboard() {
  const { status } = useSession();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch('/api/parents/me/students', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load children');
        const data = await res.json();
        setChildren(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError('Unable to load your children right now.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [status]);

  if (loading) {
    return <div className="page-content p-8 text-center text-sm text-muted-foreground">Loading children…</div>;
  }

  return (
    <div className="page-content mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Parent Portal</h1>
        <p className="mt-1 text-muted-foreground">Overview of children linked to your account.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!error && children.length === 0 ? (
        <EmptyState
          title="No children linked yet"
          description="Ask the school office to link student records to this parent account."
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children.map((kinship) => {
          const student = kinship.studentRecord;
          const studentId = student.user.id;
          return (
            <Card key={kinship.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{student.user.name}</CardTitle>
                    <CardDescription>{student.admissionNumber || 'No admission number'}</CardDescription>
                  </div>
                  <Badge variant="outline">{kinship.relationship}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span>
                    {student.myClass?.name || 'No Class'}
                    {student.section ? ` - ${student.section.name}` : ''}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full" variant="secondary">
                    <Link href="/portal/parent/fees">View fee status</Link>
                  </Button>
                  {studentId ? (
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/exams/results/report-card?studentId=${studentId}`}>
                        Open report card tools
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
