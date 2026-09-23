import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">404</p>
      <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page does not exist or you may not have access to it. Return to the dashboard to continue.
      </p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
