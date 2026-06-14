"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Paper } from "@/lib/types";
import { Icon } from "@/components/ui";

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

/* ---------- Generic mini-viz primitives (used by ResultInsights) ---------- */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

interface Bar {
  label: string;
  value: number;
  full?: string | number;
}

/* Vertical bar histogram with a value bubble on hover. */
export function BarHistogram({ data }: { data: Bar[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((d, i) => {
        const active = hover === i;
        return (
          <div
            key={d.label}
            className="flex h-full flex-1 flex-col items-center justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className={`mb-1 text-[10px] font-bold tabular-nums text-brand-600 transition-opacity dark:text-brand-300 ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              {fmtNum(d.value)}
            </span>
            <div
              title={`${d.full ?? d.label}: ${d.value}`}
              className={`w-full rounded-t-md transition-all duration-300 ${
                active
                  ? "bg-gradient-to-t from-accent-500 to-brand-400"
                  : "bg-gradient-to-t from-brand-500/70 to-brand-400/80"
              }`}
              style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
            />
            <span className="mt-1.5 text-[9px] tabular-nums text-ink-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Horizontal ranked bars (venues, sources …). */
export function HBars({ data }: { data: Bar[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2.5 text-xs">
          <span className="w-28 shrink-0 truncate text-ink-600 dark:text-ink-300" title={d.label}>
            {d.label}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500 transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
          <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-ink-500">
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  arxiv: "arXiv",
  semantic_scholar: "Semantic Scholar",
  semanticscholar: "Semantic Scholar",
  openalex: "OpenAlex",
  crossref: "Crossref",
  pubmed: "PubMed",
  core: "CORE",
  doaj: "DOAJ",
  unpaywall: "Unpaywall",
  europepmc: "Europe PMC",
  biorxiv: "bioRxiv",
};

function prettySource(s: string): string {
  return (
    SOURCE_LABELS[s.toLowerCase()] ||
    s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

/* "Results at a glance" — analytics computed from the actual result papers. */
export function ResultInsights({ papers }: { papers: Paper[] }) {
  const d = useMemo(() => {
    const years = new Map<number, number>();
    const venues = new Map<string, number>();
    const sources = new Map<string, number>();
    const nextYear = new Date().getFullYear() + 1;
    let cites = 0;
    let seminal = 0;
    const citeArr: number[] = [];

    for (const p of papers) {
      if (p.year && p.year > 1950 && p.year <= nextYear)
        years.set(p.year, (years.get(p.year) || 0) + 1);
      const v = p.venue?.trim();
      if (v) venues.set(v, (venues.get(v) || 0) + 1);
      if (p.source) sources.set(p.source, (sources.get(p.source) || 0) + 1);
      if (typeof p.citation_count === "number" && p.citation_count >= 0) {
        cites += p.citation_count;
        citeArr.push(p.citation_count);
      }
      if (p.is_seminal) seminal++;
    }

    // Fill year gaps so the histogram reads as a continuous timeline.
    let yearData: Bar[] = [];
    const yrs = [...years.keys()].sort((a, b) => a - b);
    if (yrs.length) {
      const lo = yrs[0];
      const hi = yrs[yrs.length - 1];
      const span = hi - lo;
      // Cap to a readable window (most recent ~18 years).
      const start = span > 18 ? hi - 18 : lo;
      for (let y = start; y <= hi; y++)
        yearData.push({ label: `'${String(y).slice(2)}`, value: years.get(y) || 0, full: y });
    }

    const venueData: Bar[] = [...venues.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([l, v]) => ({ label: l, value: v }));
    const sourceData: Bar[] = [...sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([l, v]) => ({ label: prettySource(l), value: v }));

    citeArr.sort((a, b) => a - b);
    const median = citeArr.length ? citeArr[Math.floor(citeArr.length / 2)] : 0;

    return {
      yearData,
      venueData,
      sourceData,
      total: papers.length,
      cites,
      median,
      seminal,
      span: yrs.length ? { lo: yrs[0], hi: yrs[yrs.length - 1] } : null,
    };
  }, [papers]);

  if (papers.length < 3) return null;

  return (
    <div className="card animate-fade-up p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
          <Icon.trend className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-bold">Results at a glance</p>
          <p className="text-xs text-ink-400">A quick read on the {d.total} papers found</p>
        </div>
      </div>

      {/* Headline stats */}
      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <span className="chip-muted">
          <b className="text-ink-700 dark:text-ink-200">{d.total}</b>&nbsp;papers
        </span>
        <span className="chip-muted">
          <b className="text-ink-700 dark:text-ink-200">{fmtNum(d.cites)}</b>&nbsp;total citations
        </span>
        <span className="chip-muted">
          median&nbsp;<b className="text-ink-700 dark:text-ink-200">{fmtNum(d.median)}</b>
        </span>
        {d.seminal > 0 && (
          <span className="chip bg-amber-50 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            ⭐ {d.seminal} seminal
          </span>
        )}
        {d.span && (
          <span className="chip-muted">
            {d.span.lo}–{d.span.hi}
          </span>
        )}
      </div>

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        {d.yearData.length > 1 && (
          <div className="lg:col-span-2">
            <p className="label mb-3">Papers by year</p>
            <BarHistogram data={d.yearData} />
          </div>
        )}
        {d.venueData.length > 0 && (
          <div>
            <p className="label mb-3">Top venues</p>
            <HBars data={d.venueData} />
          </div>
        )}
        {d.sourceData.length > 0 && (
          <div>
            <p className="label mb-3">Where they came from</p>
            <HBars data={d.sourceData} />
          </div>
        )}
      </div>
    </div>
  );
}
