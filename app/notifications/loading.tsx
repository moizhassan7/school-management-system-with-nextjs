import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="page-content mx-auto w-full max-w-[1500px] space-y-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-[32rem] w-full rounded-2xl" />
    </div>
  );
}
