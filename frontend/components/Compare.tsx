"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Paper } from "@/lib/types";
import { Icon } from "@/components/ui";
import { useToast } from "@/components/Toast";

interface CompareCtx {
  selected: Paper[];
  toggle: (p: Paper) => void;
  isSelected: (p: Paper) => boolean;
  clear: () => void;
}

const Ctx = createContext<CompareCtx>({
  selected: [],
  toggle: () => {},
  isSelected: () => false,
  clear: () => {},
});

export function useCompare() {
  return useContext(Ctx);
}

const MAX = 4;

function row(label: string, vals: (string | number | null | undefined)[]) {
  return { label, vals: vals.map((v) => (v == null || v === "" ? "—" : String(v))) };
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Paper[]>([]);
  const [open, setOpen] = useState(false);

  const isSelected = useCallback(
    (p: Paper) => selected.some((s) => s.title === p.title),
    [selected]
  );

  const toggle = useCallback(
    (p: Paper) => {
      setSelected((cur) => {
        if (cur.some((s) => s.title === p.title)) {
          return cur.filter((s) => s.title !== p.title);
        }
        if (cur.length >= MAX) {
          toast(`Compare up to ${MAX} papers at a time.`, "info");
          return cur;
        }
        return [...cur, p];
      });
    },
    [toast]
  );

  const clear = useCallback(() => setSelected([]), []);

  const rows = [
    row("Year", selected.map((p) => p.year)),
    row("Venue", selected.map((p) => p.venue)),
    row("Publisher", selected.map((p) => p.publisher)),
    row("Citations", selected.map((p) => p.citation_count?.toLocaleString())),
    row("Source", selected.map((p) => p.source)),
    row("Authors", selected.map((p) => p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? " et al." : ""))),
    row("Relevance", selected.map((p) => `${Math.round(p.relevance_score * 100)}%`)),
  ];

  return (
    <Ctx.Provider value={{ selected, toggle, isSelected, clear }}>
      {children}

      {/* Floating selection bar */}
      {selected.length > 0 && !open && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 animate-fade-up items-center gap-3 rounded-2xl border border-ink-200/70 bg-white/95 px-4 py-3 shadow-lift backdrop-blur dark:border-ink-800 dark:bg-ink-900/95">
          <span className="text-sm font-medium">
            <b className="text-brand-600">{selected.length}</b> selected to compare
          </span>
          <button
            onClick={() => setOpen(true)}
            disabled={selected.length < 2}
            className="btn-primary !py-2 disabled:opacity-50"
          >
            Compare
          </button>
          <button onClick={clear} className="btn-ghost !py-2" aria-label="Clear">
            <Icon.close className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Comparison modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative max-h-[85vh] w-full max-w-5xl animate-scale-in overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-950">
            <div className="flex items-center justify-between border-b border-ink-100 p-5 dark:border-ink-800">
              <h2 className="text-lg font-bold">Compare {selected.length} papers</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="btn-ghost h-8 w-8 !px-0">
                <Icon.close className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-auto p-5" style={{ maxHeight: "calc(85vh - 70px)" }}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 w-28 bg-white p-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 dark:bg-ink-950"></th>
                    {selected.map((p, i) => (
                      <th key={i} className="min-w-[200px] border-l border-ink-100 p-3 text-left align-top dark:border-ink-800">
                        <a href={p.url || "#"} target="_blank" rel="noreferrer" className="font-semibold leading-snug hover:text-brand-600">
                          {p.title}
                        </a>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-ink-100 dark:border-ink-800">
                      <td className="sticky left-0 bg-white p-2 align-top text-xs font-semibold text-ink-400 dark:bg-ink-950">
                        {r.label}
                      </td>
                      {r.vals.map((v, i) => (
                        <td key={i} className="border-l border-ink-100 p-3 align-top text-ink-700 dark:border-ink-800 dark:text-ink-200">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Abstracts row */}
                  <tr className="border-t border-ink-100 dark:border-ink-800">
                    <td className="sticky left-0 bg-white p-2 align-top text-xs font-semibold text-ink-400 dark:bg-ink-950">
                      Abstract
                    </td>
                    {selected.map((p, i) => (
                      <td key={i} className="border-l border-ink-100 p-3 align-top text-xs leading-relaxed text-ink-600 dark:border-ink-800 dark:text-ink-300">
                        <div className="max-h-48 overflow-auto">{p.abstract || "—"}</div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
