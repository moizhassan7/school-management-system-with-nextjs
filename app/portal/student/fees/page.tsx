import { EmptyState } from '@/components/empty-state';

export default function StudentFeesPortal() {
  return (
    <div className="page-content mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Fee Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Outstanding school fees for your account.</p>
      </div>
      <EmptyState
        title="Fee details are managed by the accounts office"
        description="Please contact the school accounts office or ask your parent/guardian to check fee status with them."
      />
    </div>
  );
}
