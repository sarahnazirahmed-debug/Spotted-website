// Loading blocks: grey blocks with a light band that sweeps across every 1.4 seconds (the CSS is in globals.css).
// With Reduce Motion on, the blocks stay still. The colours come from src/styles/colors.css.
// Pictures like these say nothing to a screen reader, so they are hidden; one hidden word says "Loading".

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// A few blocks that stand in for text and cards while something loads on a page.
export function LoadingBlocks({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={`grid gap-3 ${className}`}>
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-1/2" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-14 ${i % 2 === 0 ? "w-full" : "w-5/6"}`} />
      ))}
    </div>
  );
}

// A whole page while it loads: a top bar, a title band, and a few cards. Shown by src/app/loading.tsx for every page.
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-page text-onpage">
      <span className="sr-only">Loading</span>
      <div aria-hidden="true" className="flex h-16 items-center gap-3 bg-bar px-3">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="ml-auto h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div aria-hidden="true" className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:py-20">
        <div className="grid gap-4">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}
