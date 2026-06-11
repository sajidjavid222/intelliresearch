"use client";

import type { ReactNode } from "react";

/* ---------------- Icons (inline, currentColor) ---------------- */
type IconProps = { className?: string };
const base = "h-4 w-4";

export const Icon = {
  paper: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2h7l5 5v15H6z" strokeLinejoin="round" />
      <path d="M13 2v5h5M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  ),
  dataset: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </svg>
  ),
  code: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 6l-4 12" />
    </svg>
  ),
  grant: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" /><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.7c0 2.3-5 1.3-5 3.6 0 1.1 1 1.7 2.5 1.7s2.5-.5 2.5-1.5" />
    </svg>
  ),
  conf: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  patent: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  people: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 4.5a3 3 0 0 1 0 6M21 20c0-2.5-1.4-4-3.5-4.6" />
    </svg>
  ),
  review: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16M4 10h10M4 15h16M4 20h7" />
    </svg>
  ),
  gap: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  star: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={p.className || base}>
      <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
    </svg>
  ),
  download: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
  external: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  ),
  chat: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
    </svg>
  ),
  clock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  trend: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-5 4 4 8-8M16 4h5v5" />
    </svg>
  ),
  arrowUp: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  close: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  share: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  ),
  network: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" />
      <path d="M7 7.5 10.5 16M17 7.5 13.5 16M7.2 6h9.6" />
    </svg>
  ),
  sparkles: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9zM5 16l.7 1.6L7.3 18.3l-1.6.7L5 20.6l-.7-1.6-1.6-.7 1.6-.7z" />
    </svg>
  ),
  fileText: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  ),
  building: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V5l7-3 7 3v16M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
    </svg>
  ),
  calendar: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  coin: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M14.8 9.2A3.2 3.2 0 0 0 12 8c-1.8 0-3.2.9-3.2 2s1.4 2 3.2 2 3.2.9 3.2 2-1.4 2-3.2 2a3.2 3.2 0 0 1-2.8-1.2M12 6.5v11" />
    </svg>
  ),
  pin: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  moon: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  arrowRight: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className || base} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
  ),
};

/* ---------------- Skeleton card list ---------------- */
export function SkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="skeleton mb-3 h-5 w-3/4" />
          <div className="skeleton mb-2 h-3 w-1/2" />
          <div className="flex gap-2">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
          <div className="skeleton mt-3 h-3 w-full" />
          <div className="skeleton mt-2 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800">
        {icon || <Icon.search className="h-5 w-5" />}
      </div>
      <p className="font-semibold text-ink-700 dark:text-ink-200">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-400">{hint}</p>}
    </div>
  );
}

/* ---------------- Score bar ---------------- */
export function ScoreBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <span className="text-[11px] text-ink-400">{label}</span>}
    </div>
  );
}
