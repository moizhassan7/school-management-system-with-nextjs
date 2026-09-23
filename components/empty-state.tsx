import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className
      )}
    >
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Button asChild className="mt-4" variant="default">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
