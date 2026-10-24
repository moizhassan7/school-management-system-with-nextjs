import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import NotificationCenter from '@/components/notifications/notification-center';
import { can } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Send and receive school notifications',
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <NotificationCenter
      canManage={can(session.user, 'NOTIFICATIONS', 'CREATE')}
      currentSchoolId={session.user.schoolId || ''}
      userRole={session.user.role || ''}
    />
  );
}
