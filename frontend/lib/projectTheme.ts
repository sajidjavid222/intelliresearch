// Shared visual theme + date helpers for Research Projects.
// Full literal class strings so Tailwind's JIT picks them up.

export const PROJECT_COLORS: Record<
  string,
  { bar: string; dot: string; chip: string }
> = {
  brand: {
    bar: "from-brand-400 to-brand-600",
    dot: "bg-brand-500",
    chip: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  },
  accent: {
    bar: "from-accent-400 to-accent-600",
    dot: "bg-accent-500",
    chip: "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  },
  rose: {
    bar: "from-rose-400 to-rose-600",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  amber: {
    bar: "from-amber-400 to-amber-600",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  sky: {
    bar: "from-sky-400 to-sky-600",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  emerald: {
    bar: "from-emerald-400 to-emerald-600",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  violet: {
    bar: "from-violet-400 to-violet-600",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
};

export const COLOR_KEYS = Object.keys(PROJECT_COLORS);

export function projectColor(key: string) {
  return PROJECT_COLORS[key] || PROJECT_COLORS.brand;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Relative-time label for a project's last-updated timestamp. */
export function relTime(iso: string): string {
  const then = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).getTime();
  if (isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

/** A due-date badge for a task: color by urgency, null due => no badge. */
export function dueBadge(
  due: string | null
): { label: string; cls: string } | null {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
      ? "Due today"
      : days === 1
      ? "Due tomorrow"
      : `Due ${fmtDate(due)}`;
  const cls =
    days < 0
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
      : days <= 3
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
      : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300";
  return { label, cls };
}
