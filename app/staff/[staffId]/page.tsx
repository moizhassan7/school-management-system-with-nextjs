'use client';

import { useEffect, useState } from 'react';
import StaffForm from '@/components/staff-form';
import { Button } from '@/components/ui/button';

export default function StaffDetailPage({ params }: { params: { staffId: string } }) {
  const { staffId } = params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!staffId || staffId === 'undefined') {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/staff/${staffId}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [staffId]);

  const softDelete = async () => {
    if (!confirm('Soft delete this staff member?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, { method: 'DELETE' });
      if (res.ok) location.href = '/staff';
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Not found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Staff</h1>
          <p className="text-muted-foreground">Update details and assignments.</p>
        </div>
        <Button variant="destructive" onClick={softDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Soft Delete'}
        </Button>
      </div>
      <StaffForm staffId={staffId} initialData={data} onSuccess={() => { location.href = '/staff'; }} />
    </div>
  );
}
