export default function Loading() {
  return (
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6 p-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted/50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
