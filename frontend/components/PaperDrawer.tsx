"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { Paper } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { TranslateButton } from "@/components/Translate";
import { Icon } from "@/components/ui";

const DrawerCtx = createContext<(p: Paper) => void>(() => {});
export function usePaperDrawer() {
  return useContext(DrawerCtx);
}

function metaRow(label: string, value?: string | number | null) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-2 text-sm dark:border-ink-800">
      <span className="shrink-0 text-ink-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function bibtex(p: Paper): string {
  const first = (p.authors[0]?.split(" ").pop() || "anon").toLowerCase().replace(/[^a-z]/g, "");
  const word = (p.title?.toLowerCase().split(" ")[0] || "x").replace(/[^a-z]/g, "");
  const key = `${first}${p.year || ""}${word}`;
  const fields = [
    `  title = {${p.title}}`,
    `  author = {${p.authors.join(" and ") || "Unknown"}}`,
  ];
  if (p.year) fields.push(`  year = {${p.year}}`);
  if (p.venue) fields.push(`  journal = {${p.venue}}`);
  if (p.doi) fields.push(`  doi = {${p.doi}}`);
  if (p.url) fields.push(`  url = {${p.url}}`);
  return `@article{${key},\n${fields.join(",\n")}\n}`;
}

export function PaperDrawerProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [similar, setSimilar] = useState<Paper[] | null>(null);
  const [loadingSim, setLoadingSim] = useState(false);

  const open = useCallback((p: Paper) => {
    setPaper(p);
    setSimilar(null);
  }, []);

  const close = useCallback(() => setPaper(null), []);

  // Esc to close + body scroll lock.
  useEffect(() => {
    if (!paper) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [paper, close]);

  async function loadSimilar() {
    if (!paper || loadingSim) return;
    setLoadingSim(true);
    try {
      const r = await api.related(paper.title, 6);
      setSimilar(r.filter((x) => x.title !== paper.title));
    } catch {
      setSimilar([]);
    } finally {
      setLoadingSim(false);
    }
  }

  function copyBibtex() {
    if (!paper) return;
    navigator.clipboard?.writeText(bibtex(paper));
    toast("BibTeX copied to clipboard.", "success");
  }

  return (
    <DrawerCtx.Provider value={open}>
      {children}

      {/* Overlay */}
      {paper && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
            onClick={close}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Paper details"
            className="relative flex h-full w-full max-w-md flex-col border-l border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-950"
            style={{ animation: "fade-up .3s cubic-bezier(.2,.8,.2,1) both" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-ink-100 p-5 dark:border-ink-800">
              <div className="flex flex-wrap items-center gap-2">
                {paper.publisher && (
                  <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    🏛 {paper.publisher}
                  </span>
                )}
                {paper.is_seminal && (
                  <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    ⭐ Seminal
                  </span>
                )}
                <span className="chip-muted">{paper.source}</span>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="btn-ghost h-8 w-8 shrink-0 !px-0"
              >
                ✕
              </button>
            </div>

            {/* Body (scrolls) */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <h2 className="text-lg font-bold leading-snug">{paper.title}</h2>
                <p className="mt-2 text-sm text-ink-500">{paper.authors.join(", ")}</p>
              </div>

              <div className="rounded-xl border border-ink-100 px-4 dark:border-ink-800">
                {metaRow("Year", paper.year)}
                {metaRow("Venue", paper.venue)}
                {metaRow("Citations", paper.citation_count?.toLocaleString())}
                {metaRow("Relevance", `${Math.round(paper.relevance_score * 100)}%`)}
                {metaRow("DOI", paper.doi)}
                {metaRow("Fields", paper.fields_of_study?.slice(0, 4).join(", "))}
              </div>

              {paper.abstract && (
                <div>
                  <h3 className="mb-1.5 text-sm font-bold text-ink-700 dark:text-ink-200">Abstract</h3>
                  <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                    {paper.abstract}
                  </p>
                  <TranslateButton text={paper.abstract} className="mt-2" />
                </div>
              )}

              {/* Similar papers */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink-700 dark:text-ink-200">Similar papers</h3>
                  {similar == null && (
                    <button onClick={loadSimilar} className="text-xs font-semibold text-brand-600 hover:underline" disabled={loadingSim}>
                      {loadingSim ? "Finding…" : "Find similar →"}
                    </button>
                  )}
                </div>
                {similar && similar.length > 0 && (
                  <div className="space-y-2">
                    {similar.slice(0, 5).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => open(s)}
                        className="block w-full rounded-lg border border-ink-100 p-2.5 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-ink-800 dark:hover:bg-brand-500/10"
                      >
                        <span className="line-clamp-2 font-medium">{s.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-400">
                          {s.year} · {(s.citation_count ?? 0).toLocaleString()} citations
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {similar && similar.length === 0 && (
                  <p className="text-xs text-ink-400">No similar papers found.</p>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="grid grid-cols-2 gap-2 border-t border-ink-100 p-4 dark:border-ink-800">
              {paper.pdf_url ? (
                <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="btn-primary">
                  <Icon.download className="h-4 w-4" /> PDF
                </a>
              ) : (
                <a href={paper.url || "#"} target="_blank" rel="noreferrer" className="btn-primary">
                  <Icon.external className="h-4 w-4" /> Open
                </a>
              )}
              <button onClick={copyBibtex} className="btn-ghost">
                ❝ Copy BibTeX
              </button>
            </div>
          </aside>
        </div>
      )}
    </DrawerCtx.Provider>
  );
}
