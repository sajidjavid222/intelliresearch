"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Paper } from "@/lib/types";
import { PaperCard } from "@/components/Cards";
import { TrendChart } from "@/components/Charts";
import { EmptyState, Icon } from "@/components/ui";

interface AuthorProfile {
  name: string;
  openalex_id?: string;
  scholar_url?: string;
  orcid?: string;
  affiliation?: string;
  works_count?: number;
  cited_by_count?: number;
  h_index?: number;
  i10_index?: number;
  topics: string[];
  counts_by_year: { year: number; count: number }[];
  counts_label?: string;
  papers: Paper[];
  source?: string;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white/60 p-3 text-center dark:border-ink-800 dark:bg-ink-900/40">
      <p className="text-2xl font-extrabold text-gradient">{value}</p>
      <p className="mt-0.5 text-xs text-ink-400">{label}</p>
    </div>
  );
}

interface Candidate {
  id: string;
  name: string;
  affiliation?: string;
  works_count?: number;
  cited_by_count?: number;
  h_index?: number;
  orcid?: string;
  topics: string[];
}

export default function AuthorPage() {
  const [name, setName] = useState("");
  const [data, setData] = useState<AuthorProfile | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("author_id");
    const n = params.get("name");
    if (id) { loadById(id); if (n) setName(n); }
    else if (n) { setName(n); search(n); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: search by name → fetch candidates and let the user disambiguate.
  async function search(n: string) {
    if (!n.trim()) return;
    setLoading(true);
    setNotFound(false);
    setData(null);
    setCandidates(null);
    try {
      const cands = await api.authorCandidates(n, 6);
      if (cands.length === 0) {
        setNotFound(true);
      } else if (cands.length === 1) {
        await loadById(cands[0].id); // unambiguous — load directly
      } else {
        setCandidates(cands); // multiple matches — show picker
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: load the EXACT author the user picked, by OpenAlex id.
  async function loadById(id: string) {
    setLoading(true);
    setNotFound(false);
    setCandidates(null);
    setData(null);
    try {
      const profile = await api.authorById(id);
      setData(profile);
      // Reflect the precise selection in the URL (shareable).
      const url = new URL(window.location.href);
      url.searchParams.set("author_id", id);
      if (profile?.name) url.searchParams.set("name", profile.name);
      window.history.replaceState(null, "", url.toString());
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // Recent years only, for a readable chart.
  const recent = data?.counts_by_year.slice(-10) || [];

  return (
    <div className="space-y-6">
      <div className="card flex gap-2 p-4">
        <div className="relative flex-1">
          <Icon.people className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-11"
            placeholder="Author name — e.g. Yoshua Bengio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(name)}
          />
        </div>
        <button className="btn-primary" onClick={() => search(name)} disabled={loading}>
          {loading ? "Loading…" : "Look up"}
        </button>
      </div>

      {loading && (
        <div className="card flex items-center justify-center gap-3 p-16 text-ink-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          Fetching author profile…
        </div>
      )}

      {notFound && (
        <EmptyState title="Author not found" hint={`No researcher found for “${name}”. Try just the name — without the institution or extra words.`} />
      )}

      {/* Candidate picker — pick the exact person */}
      {candidates && !loading && (
        <div className="card animate-fade-up p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"><Icon.people className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-bold">Multiple researchers match “{name}”</p>
              <p className="text-xs text-ink-400">Pick the right one — sorted by citations.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => loadById(c.id)}
                className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-ink-800 dark:hover:bg-brand-500/10"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-sm font-bold text-white">
                  {c.name?.[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {c.name}
                    {c.orcid && <span className="chip bg-emerald-50 text-[10px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">ORCID</span>}
                  </p>
                  <p className="truncate text-sm text-ink-500">{c.affiliation || "Affiliation unknown"}</p>
                  {c.topics.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-ink-400">{c.topics.join(" · ")}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-bold text-brand-600 dark:text-brand-400">h-{c.h_index ?? "?"}</p>
                  <p className="text-ink-400">{(c.cited_by_count ?? 0).toLocaleString()} cites</p>
                  <p className="text-ink-400">{(c.works_count ?? 0).toLocaleString()} works</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Header */}
          {/* Back to picker — only if this came from a name search */}
          {name && (
            <button
              onClick={() => search(name)}
              className="text-sm font-medium text-brand-600 transition hover:underline"
            >
              ← Not the right person? Choose again
            </button>
          )}

          <div className="card animate-fade-up p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-2xl font-bold text-white">
                {data.name?.[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-semibold">{data.name}</h1>
                  {data.source && (
                    <span
                      className={`chip ${
                        data.source === "Google Scholar"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      }`}
                      title={`Data source: ${data.source}`}
                    >
                      via {data.source}
                    </span>
                  )}
                </div>
                {data.affiliation && <p className="mt-0.5 text-sm text-ink-500">{data.affiliation}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.scholar_url && (
                    <a href={data.scholar_url} target="_blank" rel="noreferrer"
                      className="chip bg-blue-50 text-blue-700 hover:underline dark:bg-blue-500/15 dark:text-blue-300">
                      Google Scholar ↗
                    </a>
                  )}
                  {data.orcid && (
                    <a href={`https://orcid.org/${data.orcid}`} target="_blank" rel="noreferrer"
                      className="chip bg-emerald-50 text-emerald-700 hover:underline dark:bg-emerald-500/15 dark:text-emerald-300">
                      ORCID {data.orcid}
                    </a>
                  )}
                  {data.openalex_id && (
                    <a href={data.openalex_id} target="_blank" rel="noreferrer"
                      className="chip-muted hover:underline">OpenAlex ↗</a>
                  )}
                  {/* Always offer a direct Google Scholar search as a backup. */}
                  {!data.scholar_url && (
                    <a href={`https://scholar.google.com/scholar?q=author:%22${encodeURIComponent(data.name)}%22`}
                      target="_blank" rel="noreferrer"
                      className="chip-muted hover:underline">Search on Google Scholar ↗</a>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="h-index" value={data.h_index ?? "—"} />
              <Stat label="Publications" value={(data.works_count ?? 0).toLocaleString()} />
              <Stat label="Citations" value={(data.cited_by_count ?? 0).toLocaleString()} />
              <Stat label="i10-index" value={data.i10_index ?? "—"} />
            </div>

            {/* Topics */}
            {data.topics.length > 0 && (
              <div className="mt-4">
                <p className="label">Research topics</p>
                <div className="flex flex-wrap gap-2">
                  {data.topics.map((t) => (
                    <a key={t} href={`/?q=${encodeURIComponent(t)}`}
                      className="chip bg-violet-50 text-violet-700 transition hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300">
                      {t}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Publication trend */}
          {recent.length > 1 && (
            <div className="card animate-fade-up p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon.trend className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold">{data.counts_label || "Activity over time"}</p>
                  <p className="text-xs text-ink-400">From {data.source || "OpenAlex"}</p>
                </div>
              </div>
              <div className="mt-2"><TrendChart series={recent} /></div>
            </div>
          )}

          {/* Top papers */}
          <div>
            <h2 className="mb-3 text-lg font-bold">Most-cited papers</h2>
            <div className="grid gap-4">
              {data.papers.map((p, i) => <PaperCard key={i} p={p} />)}
            </div>
          </div>
        </>
      )}

      {!data && !loading && !notFound && (
        <EmptyState
          icon={<Icon.people className="h-5 w-5" />}
          title="Look up any researcher"
          hint="See their h-index, citations, top papers, and publication trend."
        />
      )}
    </div>
  );
}
