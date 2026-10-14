import { auth } from '@/auth';
import AttendanceDashboard from '@/components/attendance/attendance-dashboard';
import { getSchoolSections, getTeacherSections } from '@/lib/actions/attendance';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    <div>
      {seesAllClasses ? (
        <div className="flex justify-end bg-gray-50 px-6 pt-6">
          <Button asChild variant="outline">
            <Link href="/attendance/devices">Biometric devices</Link>
          </Button>
        </div>
      ) : null}
      <AttendanceDashboard
        initialSections={sections}
        userId={session.user.id}
        seesAllClasses={seesAllClasses}
      />
    </div>
  );
}
