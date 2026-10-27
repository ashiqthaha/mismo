/** Placeholder shown while a page's data loads. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-stone-200" />
      <div className="h-28 rounded-xl bg-stone-200/70" />
      <div className="h-28 rounded-xl bg-stone-200/70" />
    </div>
  );
}
