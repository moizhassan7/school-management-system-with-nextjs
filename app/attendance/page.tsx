import { auth } from '@/auth';
import AttendanceDashboard from '@/components/attendance/attendance-dashboard';
import { getSchoolSections, getTeacherSections } from '@/lib/actions/attendance';
import { redirect } from 'next/navigation';

export default async function AttendancePage() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    redirect('/login');
  }

  const role = String(session.user.role || '');
  const seesAllClasses = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const sections = seesAllClasses
    ? await getSchoolSections(role, session.user.schoolId)
    : await getTeacherSections(session.user.id);

  return (
    <AttendanceDashboard
      initialSections={sections}
      userId={session.user.id}
      seesAllClasses={seesAllClasses}
    />
  );
}
