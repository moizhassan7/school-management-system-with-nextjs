import { auth } from '@/auth';
import AttendanceDashboard from '@/components/attendance/attendance-dashboard';
import { getTeacherSections } from '@/lib/actions/attendance';
import { redirect } from 'next/navigation';

export default async function AttendancePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  // Get teacher's sections
  // Assuming the user.id corresponds to the userId in StaffRecord
  // The session.user.id is usually the User model ID.
  const sections = await getTeacherSections(session.user.id);

  return <AttendanceDashboard initialSections={sections} userId={session.user.id} />;
}
