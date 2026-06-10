"use client";

import { useEffect, useRef, useState } from "react";

/* Animated number that counts up when mounted. */
export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

interface Point {
  year: number;
  count: number;
}

/* A polished area+line publication-trend chart with axis, hover, and growth. */
export function TrendChart({ series }: { series: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!series?.length) return null;

  const W = 720;
  const H = 220;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...series.map((s) => s.count), 1);
  const min = 0;

  const x = (i: number) =>
    padL + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const linePath = series.map((s, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(s.count)}`).join(" ");
  const areaPath =
    `M ${x(0)} ${y(0)} ` +
    series.map((s, i) => `L ${x(i)} ${y(s.count)}`).join(" ") +
    ` L ${x(series.length - 1)} ${y(0)} Z`;

  // Y-axis gridlines (4 ticks).
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  // Growth: first vs last.
  const first = series[0].count || 1;
  const last = series[series.length - 1].count;
  const growth = Math.round(((last - first) / first) * 100);
  const peak = series.reduce((a, b) => (b.count > a.count ? b : a), series[0]);

  function fmt(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
  }

  function onMove(e: React.MouseEvent) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    // nearest index
    let best = 0;
    let bd = Infinity;
    series.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  }

  return (
    <div className="relative">
      {/* Summary chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`chip font-semibold ${growth >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"}`}>
          {growth >= 0 ? "↗" : "↘"} {growth >= 0 ? "+" : ""}{growth}% ({series[0].year}→{series[series.length - 1].year})
        </span>
        <span className="chip-muted">Peak {peak.year}: {fmt(peak.count)} papers</span>
        <span className="chip-muted">{fmt(series.reduce((a, b) => a + b.count, 0))} total</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#13b886" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#13b886" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#13b886" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Gridlines + Y labels */}
        {ticks.map((t, i) => {
          const yy = y(t);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy}
                className="stroke-ink-200/60 dark:stroke-ink-800" strokeWidth={1} strokeDasharray="3 4" />
              <text x={padL - 8} y={yy + 3} textAnchor="end"
                className="fill-ink-400 text-[9px]">{fmt(t)}</text>
            </g>
          );
        })}

        {/* Area + line */}
        <path d={areaPath} fill="url(#trendArea)" className="animate-fade-in" />
        <path d={linePath} fill="none" stroke="url(#trendLine)" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + X labels */}
        {series.map((s, i) => {
          const active = hover === i;
          return (
            <g key={s.year}>
              <text x={x(i)} y={H - 8} textAnchor="middle"
                className={`text-[9px] ${active ? "fill-brand-600 font-bold" : "fill-ink-400"}`}>
                {s.year}
              </text>
              <circle cx={x(i)} cy={y(s.count)} r={active ? 5 : 3}
                className="fill-white transition-all" stroke="#13b886" strokeWidth={2} />
            </g>
          );
        })}

        {/* Hover guide line */}
        {hover != null && (
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + innerH}
            className="stroke-brand-400/40" strokeWidth={1} />
        )}
      </svg>

      {/* Tooltip */}
      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs shadow-lift dark:border-ink-800 dark:bg-ink-900"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(series[hover].count) / H) * 100 + 6}%` }}
        >
          <span className="font-bold">{series[hover].count.toLocaleString()}</span>
          <span className="text-ink-400"> papers in {series[hover].year}</span>
        </div>
      )}
    </div>
  );
}
