import { EmptyState } from '@/components/empty-state';

export default function StudentAttendancePortal() {
  return (
    <div className="page-content mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">My Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your recorded attendance by date.</p>
      </div>
      <EmptyState
        title="Attendance history is not published to students yet"
        description="Your class teacher records attendance in the staff portal. Contact them if you need a printout."
      />
    </div>
  );
}
