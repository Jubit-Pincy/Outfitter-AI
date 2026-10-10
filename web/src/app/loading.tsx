/**
 * Today and /weather are server-rendered from a geocode plus a forecast, which
 * is a real wait on a cold cache. Without this the browser sat on the previous
 * page with no sign anything was happening.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mb-2 h-9 w-72 max-w-full rounded-lg bg-linen-2" />
      <div className="mb-7 h-5 w-96 max-w-full rounded bg-linen-2/70" />
      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.25fr)]">
        <div className="h-[124px] rounded-2xl bg-linen-2" />
        <div className="h-[124px] rounded-2xl bg-linen-2/70" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-[430px] rounded-2xl bg-linen-2/70" />
        <div className="h-[430px] rounded-2xl bg-linen-2/50" />
      </div>
    </div>
  );
}
