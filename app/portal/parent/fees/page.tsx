'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Child {
  id: string;
  relationship: string;
  studentRecord: {
    admissionNumber: string | null;
    user: { id: string; name: string };
    myClass: { name: string } | null;
  };
}

export default function ParentFeesPortal() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/parents/me/students', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setChildren(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError('Unable to load fee status right now.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="page-content mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Fee Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Children linked to your account. Payments are collected at the school accounts office.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && children.length === 0 ? (
        <EmptyState
          title="No children linked"
          description="Ask the school office to link student records to this parent account."
          actionLabel="Back to children"
          actionHref="/portal/parent"
        />
      ) : null}

      <div className="space-y-3">
        {children.map((kinship) => (
          <Card key={kinship.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{kinship.studentRecord.user.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                {kinship.studentRecord.admissionNumber || 'No admission number'}
                {kinship.studentRecord.myClass ? ` · ${kinship.studentRecord.myClass.name}` : ''}
              </p>
              <p className="mt-2">
                For challans and payments, contact accounts or visit{' '}
                <Link href="/portal/parent" className="text-primary underline-offset-2 hover:underline">
                  My Children
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
