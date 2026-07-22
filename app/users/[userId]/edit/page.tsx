'use client';

import { useState, useEffect, use } from 'react';
import UserForm from '@/components/user-form';

export default function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error('User not found');
        const json = await res.json();
        setUser(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading...</div>;
  }

  if (error || !user) {
    return <div className="p-12 text-center text-red-600">{error || 'User not found'}</div>;
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Edit User</h1>
        <p className="mt-2 text-sm text-gray-600">Account, campus access, and permissions.</p>
      </div>
      <UserForm
        userId={userId}
        initialData={{
          name: user.name,
          email: user.email,
          username: user.username,
          phone: user.phone,
          schoolId: user.schoolId,
          role: user.role,
          suspended: user.suspended,
          campusIds: user.campusIds || user.campusAccess?.map((c: any) => c.campusId) || [],
          permissionOverrides: user.permissionOverrides || [],
        }}
      />
    </div>
  );
}
