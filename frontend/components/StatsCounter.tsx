"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  icon: ReactNode;
}

const STATS: Stat[] = [
  { value: 200, suffix: "M+", label: "Papers indexed", icon: <Icon.paper className="h-5 w-5" /> },
  { value: 12, suffix: "", label: "Live sources", icon: <Icon.network className="h-5 w-5" /> },
  { value: 10, suffix: "", label: "AI agents", icon: <Icon.sparkles className="h-5 w-5" /> },
  { value: 500, suffix: "k+", label: "Datasets", icon: <Icon.dataset className="h-5 w-5" /> },
];

/** Counts up from 0 → value with easeOutExpo once `run` becomes true. */
function useCountUp(target: number, run: boolean, duration = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);
  return n;
}

function StatCell({ stat, run, i }: { stat: Stat; run: boolean; i: number }) {
  const n = useCountUp(stat.value, run);
  return (
    <div
      className="group relative flex flex-col items-center gap-2 px-4 py-2 text-center"
      style={{ animation: run ? `fade-up .6s ${i * 90}ms both` : undefined }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-brand-600 ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-110 dark:text-brand-300 dark:ring-white/10">
        {stat.icon}
      </span>
      <p className="bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 bg-clip-text text-3xl font-extrabold tabular-nums tracking-tight text-transparent sm:text-4xl">
        {n.toLocaleString()}
        {stat.suffix}
      </p>
      <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{stat.label}</p>
    </div>
  );
}

export function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRun(true); obs.disconnect(); } },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="card relative overflow-hidden p-6"
    >
      {/* soft animated glow behind the numbers */}
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-2/3 -translate-x-1/2 animate-aurora rounded-full bg-gradient-to-r from-brand-400/20 via-accent-400/20 to-brand-400/20 blur-3xl" />
      <div className="relative grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-ink-100 dark:sm:divide-ink-800">
        {STATS.map((s, i) => (
          <StatCell key={s.label} stat={s} run={run} i={i} />
        ))}
      </div>
    </div>
  );
}
