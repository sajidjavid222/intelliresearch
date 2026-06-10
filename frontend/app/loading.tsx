export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-400">
        <span className="relative grid h-12 w-12 place-items-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/40" />
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            ✦
          </span>
        </span>
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
