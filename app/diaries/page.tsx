import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import DiaryCenter from '@/components/diaries/diary-center';
import { can } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'Homework Diary',
  description: 'Create, approve, and view class homework diaries',
};

export default async function DiariesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <DiaryCenter
      userRole={session.user.role || ''}
      canCreate={can(session.user, 'DIARIES', 'CREATE')}
      canApprove={can(session.user, 'DIARIES', 'APPROVE')}
      canDelete={can(session.user, 'DIARIES', 'DELETE')}
    />
  );
}
