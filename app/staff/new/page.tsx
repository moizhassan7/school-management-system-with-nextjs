'use client';

import StaffForm from '@/components/staff-form';

export default function NewStaffPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Staff</h1>
        <p className="text-muted-foreground">Create a new staff member.</p>
      </div>
      <StaffForm onSuccess={() => { location.href = '/staff'; }} />
    </div>
  );
}
