'use client';

import StaffForm from '@/components/staff-form';
import { useRouter } from 'next/navigation';

export default function NewStaffPage() {
  const router = useRouter();

  return (
    <div className="page-content mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Add Staff</h1>
        <p className="mt-1 text-muted-foreground">Create a new staff member or teacher.</p>
      </div>
      <StaffForm onSuccess={() => router.push('/staff')} />
    </div>
  );
}
