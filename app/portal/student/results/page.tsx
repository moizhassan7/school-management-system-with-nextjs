import { EmptyState } from '@/components/empty-state';

export default function StudentResultsPortal() {
  return (
    <div className="page-content mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">My Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published exam results for your account.
        </p>
      </div>
      <EmptyState
        title="Results are not available in the student portal yet"
        description="Ask your teacher or school office for report cards. Staff can generate them from Academics → Report Cards."
      />
    </div>
  );
}
