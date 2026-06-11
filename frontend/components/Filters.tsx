"use client";

import { useMemo } from "react";
import type { Paper } from "@/lib/types";

export interface PaperFilters {
  sources: string[];
  publishers: string[];
  yearMin: number | null;
  yearMax: number | null;
  minCitations: number;
  hasPdf: boolean;
  seminalOnly: boolean;
  sortBy: "relevance" | "citations" | "year";
}

export const EMPTY_FILTERS: PaperFilters = {
  sources: [],
  publishers: [],
  yearMin: null,
  yearMax: null,
  minCitations: 0,
  hasPdf: false,
  seminalOnly: false,
  sortBy: "relevance",
};

/** Apply filters + sort to a list of papers. Pure function (also reused for counts). */
export function applyFilters(papers: Paper[], f: PaperFilters): Paper[] {
  let out = papers.filter((p) => {
    if (f.sources.length && !f.sources.includes(p.source)) return false;
    if (f.publishers.length && !(p.publisher && f.publishers.includes(p.publisher)))
      return false;
    if (f.yearMin != null && (p.year ?? 0) < f.yearMin) return false;
    if (f.yearMax != null && (p.year ?? 9999) > f.yearMax) return false;
    if (f.minCitations > 0 && (p.citation_count ?? 0) < f.minCitations) return false;
    if (f.hasPdf && !p.pdf_url) return false;
    if (f.seminalOnly && !p.is_seminal) return false;
    return true;
  });

  out = [...out].sort((a, b) => {
    if (f.sortBy === "citations") return (b.citation_count ?? 0) - (a.citation_count ?? 0);
    if (f.sortBy === "year") return (b.year ?? 0) - (a.year ?? 0);
    return b.relevance_score - a.relevance_score;
  });
  return out;
}

export function activeFilterCount(f: PaperFilters): number {
  let n = 0;
  if (f.sources.length) n++;
  if (f.publishers.length) n++;
  if (f.yearMin != null || f.yearMax != null) n++;
  if (f.minCitations > 0) n++;
  if (f.hasPdf) n++;
  if (f.seminalOnly) n++;
  return n;
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`chip border transition ${
        on
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
          : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400"
      }`}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

export function Filters({
  papers,
  filters,
  setFilters,
  open,
  onToggleOpen,
}: {
  papers: Paper[];
  filters: PaperFilters;
  setFilters: (f: PaperFilters) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  // Derive available facets + counts from the unfiltered result set.
  const { sources, publishers, minYear, maxYear } = useMemo(() => {
    const srcCount = new Map<string, number>();
    const pubCount = new Map<string, number>();
    const years: number[] = [];
    for (const p of papers) {
      srcCount.set(p.source, (srcCount.get(p.source) || 0) + 1);
      if (p.publisher) pubCount.set(p.publisher, (pubCount.get(p.publisher) || 0) + 1);
      if (p.year) years.push(p.year);
    }
    const sortByCount = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]);
    return {
      sources: sortByCount(srcCount),
      publishers: sortByCount(pubCount),
      minYear: years.length ? Math.min(...years) : 2000,
      maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    };
  }, [papers]);

  const n = activeFilterCount(filters);
  const set = (patch: Partial<PaperFilters>) => setFilters({ ...filters, ...patch });

  function toggleIn(list: string[], val: string): string[] {
    return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
  }

  return (
    <div className="card overflow-hidden">
      {/* Header bar */}
      <button
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            ⚙
          </span>
          Filters
          {n > 0 && (
            <span className="chip bg-brand-500 text-white">{n} active</span>
          )}
        </span>
        <span className="flex items-center gap-3 text-xs text-ink-400">
          {n > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setFilters(EMPTY_FILTERS);
              }}
              className="font-medium text-rose-500 hover:text-rose-600"
            >
              Clear all
            </span>
          )}
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-ink-100 px-4 py-4 dark:border-ink-800">
          {/* Sort */}
          <div>
            <p className="label">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {([
                ["relevance", "Relevance"],
                ["citations", "Most cited"],
                ["year", "Newest"],
              ] as const).map(([key, lbl]) => (
                <button
                  key={key}
                  onClick={() => set({ sortBy: key })}
                  className={`chip border transition ${
                    filters.sortBy === key
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <p className="label">Source</p>
              <div className="flex flex-wrap gap-2">
                {sources.map(([src, cnt]) => {
                  const on = filters.sources.includes(src);
                  return (
                    <button
                      key={src}
                      onClick={() => set({ sources: toggleIn(filters.sources, src) })}
                      className={`chip border transition ${
                        on
                          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
                          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {src}
                      <span className="text-ink-400">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Publishers */}
          {publishers.length > 0 && (
            <div>
              <p className="label">Publisher</p>
              <div className="flex flex-wrap gap-2">
                {publishers.map(([pub, cnt]) => {
                  const on = filters.publishers.includes(pub);
                  return (
                    <button
                      key={pub}
                      onClick={() => set({ publishers: toggleIn(filters.publishers, pub) })}
                      className={`chip border transition ${
                        on
                          ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300"
                          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {pub}
                      <span className="text-ink-400">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Year range */}
          <div>
            <p className="label">
              Publication year
              <span className="ml-2 font-normal text-ink-400">
                {filters.yearMin ?? minYear} – {filters.yearMax ?? maxYear}
              </span>
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={filters.yearMin ?? minYear}
                min={minYear}
                max={maxYear}
                onChange={(e) =>
                  set({ yearMin: e.target.value ? Number(e.target.value) : null })
                }
                className="input w-24 !py-1.5"
              />
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={filters.yearMin ?? minYear}
                onChange={(e) => set({ yearMin: Number(e.target.value) })}
                className="flex-1 accent-brand-500"
              />
              <span className="text-ink-300">→</span>
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={filters.yearMax ?? maxYear}
                onChange={(e) => set({ yearMax: Number(e.target.value) })}
                className="flex-1 accent-brand-500"
              />
              <input
                type="number"
                value={filters.yearMax ?? maxYear}
                min={minYear}
                max={maxYear}
                onChange={(e) =>
                  set({ yearMax: e.target.value ? Number(e.target.value) : null })
                }
                className="input w-24 !py-1.5"
              />
            </div>
            {/* Quick date presets */}
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ["Last year", maxYear - 1],
                ["Last 3 years", maxYear - 3],
                ["Last 5 years", maxYear - 5],
                ["Last 10 years", maxYear - 10],
              ].map(([lbl, from]) => (
                <button
                  key={lbl as string}
                  onClick={() => set({ yearMin: from as number, yearMax: maxYear })}
                  className="chip-muted hover:bg-ink-200 dark:hover:bg-ink-700"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Min citations */}
          <div>
            <p className="label">
              Minimum citations
              <span className="ml-2 font-normal text-ink-400">
                {filters.minCitations === 0 ? "any" : `${filters.minCitations}+`}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 10, 50, 100, 500, 1000].map((c) => (
                <button
                  key={c}
                  onClick={() => set({ minCitations: c })}
                  className={`chip border transition ${
                    filters.minCitations === c
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400"
                  }`}
                >
                  {c === 0 ? "Any" : `${c}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div>
            <p className="label">Quick filters</p>
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="Has PDF"
                on={filters.hasPdf}
                onClick={() => set({ hasPdf: !filters.hasPdf })}
              />
              <Toggle
                label="⭐ Seminal only"
                on={filters.seminalOnly}
                onClick={() => set({ seminalOnly: !filters.seminalOnly })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
