"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, withColdStartRetry } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";
import {
  CollaboratorCard,
  ConferenceCard,
  DatasetCard,
  GrantCard,
  PaperCard,
  PatentCard,
  RepoCard,
} from "@/components/Cards";
import { GapsPanel, ReviewPanel } from "@/components/AnalysisPanels";
import { ChatPanel } from "@/components/ChatPanel";
import { ExportMenu } from "@/components/ExportMenu";
import { ProposalBanner } from "@/components/ProposalBanner";
import { EmptyState, Icon, SkeletonCards } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { TrendChart } from "@/components/Charts";
import { StatsCounter } from "@/components/StatsCounter";
import { SourceMarquee } from "@/components/SourceMarquee";
import { Reveal } from "@/components/Reveal";
import { Magnetic } from "@/components/Magnetic";
import {
  applyFilters,
  EMPTY_FILTERS,
  Filters,
  type PaperFilters,
} from "@/components/Filters";
import {
  addRecentSearch,
  getRecentSearches,
  loadLastSearch,
  removeRecentSearch,
  saveLastSearch,
} from "@/lib/searchStore";

// 3D hero background — WebGL can't SSR, so load it client-only and lazily.
const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });

const EXAMPLES = [
  "Large language models for code generation",
  "CRISPR gene editing recent breakthroughs",
  "Indoor Wi-Fi localization using drones",
  "Grants and conferences for federated learning",
  "Diffusion models — survey, datasets & code",
  "Quantum machine learning open problems",
];

const TABS = [
  { key: "papers", label: "Papers", icon: Icon.paper },
  { key: "chat", label: "Chat", icon: Icon.chat },
  { key: "review", label: "Lit. Review", icon: Icon.review },
  { key: "gaps", label: "Gaps", icon: Icon.gap },
  { key: "datasets", label: "Datasets", icon: Icon.dataset },
  { key: "code", label: "Code", icon: Icon.code },
  { key: "grants", label: "Grants", icon: Icon.grant },
  { key: "conferences", label: "Conferences", icon: Icon.conf },
  { key: "patents", label: "Patents", icon: Icon.patent },
  { key: "collaborators", label: "Collaborators", icon: Icon.people },
] as const;

const AGENT_STEPS = [
  "Parsing intent & routing agents…",
  "Querying arXiv, Semantic Scholar & OpenAlex…",
  "Scanning Hugging Face, GitHub & Papers With Code…",
  "Checking grants, conferences & patents…",
  "Synthesizing literature review with AI…",
];

export default function Home() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [tab, setTab] = useState<string>("papers");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [wakingRetry, setWakingRetry] = useState<null | "waking" | "busy">(null);
  const [trends, setTrends] = useState<{ year: number; count: number }[]>([]);
  const [trending, setTrending] = useState<{ topic: string; tag: string; heat: number }[]>([]);
  const [filters, setFilters] = useState<PaperFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [papersPage, setPapersPage] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Reset paper pagination when the results, filters, or tab change.
  useEffect(() => setPapersPage(0), [res, filters, tab]);

  // Load trending + recent on mount; run ?q= or restore the last search.
  useEffect(() => {
    api.trending().then(setTrending).catch(() => {});
    setRecent(getRecentSearches());

    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    const initialTab = params.get("tab");
    if (initial) {
      setQ(initial);
      run(initial, initialTab || undefined);
    } else {
      // No query in URL — restore the last search so navigating back keeps it.
      const last = loadLastSearch();
      if (last) {
        setQ(last.query);
        setRes(last.response);
        setTab(last.tab);
      }
    }

    const onEvt = (e: any) => { setQ(e.detail); run(e.detail); };
    window.addEventListener("rp:search", onEvt);

    // Logo click → reset to a clean homepage (clear results, query, URL).
    const onReset = () => {
      setRes(null);
      setQ("");
      setTab("papers");
      setError("");
      setTrends([]);
      setFilters(EMPTY_FILTERS);
      window.history.replaceState(null, "", window.location.pathname);
    };
    window.addEventListener("rp:reset", onReset);

    return () => {
      window.removeEventListener("rp:search", onEvt);
      window.removeEventListener("rp:reset", onReset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync with the current search + tab so views are shareable,
  // and keep the persisted snapshot's tab current.
  useEffect(() => {
    if (!res) return;
    const params = new URLSearchParams();
    params.set("q", res.query);
    if (tab !== "papers") params.set("tab", tab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    saveLastSearch(res.query, res, tab);
  }, [res, tab]);

  function count(r: SearchResponse, key: string): number {
    switch (key) {
      case "papers": return r.papers.length;
      case "chat": return r.papers.length ? 1 : 0;
      case "review": return r.literature_review ? 1 : 0;
      case "gaps": return r.research_gaps?.opportunities.length || 0;
      case "datasets": return r.datasets.length;
      case "code": return r.repositories.length;
      case "grants": return r.grants.length;
      case "conferences": return r.conferences.length;
      case "patents": return r.patents.length;
      case "collaborators": return r.collaborators.length;
      default: return 0;
    }
  }

  async function run(query: string, preferTab?: string) {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setRes(null);
    setTrends([]);
    setStep(0);
    setWakingRetry(null);
    setFilters(EMPTY_FILTERS); // fresh filters per search
    const timer = setInterval(
      () => setStep((s) => Math.min(s + 1, AGENT_STEPS.length - 1)),
      900
    );
    setShowRecent(false);
    api.trends(query).then((t) => setTrends(t.series)).catch(() => {});
    try {
      // Auto-retry through a free-tier cold start instead of erroring out.
      const r = await withColdStartRetry(
        () => api.search(query, undefined, 15),
        { onWaking: (reason) => setWakingRetry(reason) }
      );
      setWakingRetry(null);
      setRes(r);
      const first = TABS.find((t) => count(r, t.key) > 0);
      // Honor a shared ?tab= if it has content, else first non-empty tab.
      const wanted = preferTab && count(r, preferTab) > 0 ? preferTab : null;
      const chosenTab = wanted || first?.key || "papers";
      setTab(chosenTab);
      // Persist so navigating away and back restores results; track recents.
      saveLastSearch(query, r, chosenTab);
      addRecentSearch(query);
      setRecent(getRecentSearches());
      const total = TABS.reduce((a, t) => a + count(r, t.key), 0);
      toast(`Found ${total} results across ${r.agents_run.length} agents.`, "success");
    } catch (e: any) {
      setError(e.message || "Search failed");
      toast("Search failed. Is the backend running?", "error");
    } finally {
      clearInterval(timer);
      setLoading(false);
      setWakingRetry(null);
    }
  }

  const totalResults = res ? TABS.reduce((a, t) => a + count(res, t.key), 0) : 0;

  return (
    <div className="space-y-6">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-8 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/50 sm:p-10">
        <div className="dot-grid pointer-events-none absolute inset-0" />
        {/* Liquid-glass morphing blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 animate-blob bg-gradient-to-br from-brand-300/40 to-brand-500/25 blur-2xl dark:from-brand-500/25 dark:to-brand-400/10" />
        <div className="pointer-events-none absolute -bottom-28 left-6 h-64 w-64 animate-blob-slow bg-gradient-to-tr from-accent-300/35 to-accent-500/20 blur-2xl dark:from-accent-500/20 dark:to-accent-400/10" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 animate-blob bg-sky-300/25 blur-2xl dark:bg-sky-500/10" style={{ animationDelay: "-7s" }} />
        {/* Interactive 3D knowledge-graph — all screens, faded so hero text stays crisp */}
        <div className="hero3d-mask pointer-events-none absolute inset-0 lg:left-auto lg:right-0 lg:w-3/5">
          <Hero3D />
        </div>
        <div className="relative animate-fade-up">
          <span className="chip border border-brand-200/70 bg-white/70 text-brand-700 dark:border-brand-500/30 dark:bg-ink-900/60 dark:text-brand-300">
            ✦ 10 specialized AI agents · powered by Gemini
          </span>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Your entire{" "}
            <span className="text-gradient-animated italic">research team,</span>
            <br className="hidden sm:block" /> in one search.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-500 dark:text-ink-300 sm:text-lg">
            Ask in plain English. <b className="font-semibold text-ink-700 dark:text-ink-200">IntelliResearch</b> sends
            ten AI agents across arXiv, Semantic Scholar, OpenAlex, PubMed, GitHub
            and more — returning papers, datasets, grants, conferences, patents,
            code and collaborators, then writing a cited literature review for you.
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Icon.search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                aria-label="Search research"
                className="input pl-11 !py-3.5 text-[15px] shadow-soft"
                placeholder="e.g. Recent papers on indoor Wi-Fi localization using drones"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setShowRecent(true)}
                onBlur={() => setTimeout(() => setShowRecent(false), 150)}
                onKeyDown={(e) => e.key === "Enter" && run(q)}
              />
              {/* Recent searches dropdown */}
              {showRecent && recent.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 animate-scale-in overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900">
                  <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    <span className="flex items-center gap-1.5"><Icon.clock className="h-3.5 w-3.5" /> Recent</span>
                  </div>
                  {recent.map((rq) => (
                    <div key={rq} className="group flex items-center justify-between gap-2 px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                      <button
                        onMouseDown={(e) => { e.preventDefault(); setQ(rq); run(rq); }}
                        className="flex flex-1 items-center gap-2 truncate text-left text-sm"
                      >
                        <Icon.clock className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                        <span className="truncate">{rq}</span>
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); removeRecentSearch(rq); setRecent(getRecentSearches()); }}
                        aria-label="Remove"
                        className="shrink-0 text-ink-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                      >
                        <Icon.close className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Magnetic strength={0.25} className="sm:w-36">
              <button className="btn-primary w-full !py-3.5" onClick={() => run(q)} disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </button>
            </Magnetic>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Try</span>
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => { setQ(e); run(e); }}
                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink-200/70 bg-white/60 px-3 py-1.5 text-sm text-ink-600 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-300 dark:hover:bg-brand-500/10">
                <Icon.search className="h-3.5 w-3.5 text-ink-300 transition-colors group-hover:text-brand-500" />
                {e}
              </button>
            ))}
          </div>

          {/* Recent searches — kept right in the search options */}
          {recent.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                <Icon.clock className="h-3.5 w-3.5" /> Recent
              </span>
              {recent.slice(0, 6).map((rq) => (
                <button key={rq} onClick={() => { setQ(rq); run(rq); }}
                  className="group inline-flex items-center gap-1 rounded-full bg-ink-100/70 px-3 py-1.5 text-sm text-ink-600 transition hover:bg-brand-50 hover:text-brand-600 dark:bg-ink-800/60 dark:text-ink-300 dark:hover:bg-brand-500/15">
                  {rq.length > 36 ? rq.slice(0, 36) + "…" : rq}
                  <span
                    onClick={(ev) => { ev.stopPropagation(); removeRecentSearch(rq); setRecent(getRecentSearches()); }}
                    className="text-ink-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Trusted data-sources marquee (landing only) */}
          {!res && <SourceMarquee />}
        </div>
      </section>

      {error && (
        <div className="card border-rose-300/60 bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* ---------- Loading ---------- */}
      {loading && (
        <>
          <div className={`card animate-fade-in flex items-center gap-4 p-5 ${wakingRetry ? "border-amber-300/60 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10" : ""}`}>
            <span className="relative grid h-11 w-11 shrink-0 place-items-center">
              <span className={`absolute inset-0 animate-pulse-ring rounded-full ${wakingRetry ? "bg-amber-400/40" : "bg-brand-400/40"}`} />
              <span className={`grid h-11 w-11 place-items-center rounded-full text-white ${wakingRetry ? "bg-amber-500" : "bg-brand-500"}`}>
                {wakingRetry ? <Icon.moon className="h-5 w-5" /> : <Icon.search className="h-5 w-5" />}
              </span>
            </span>
            <div className="min-w-0">
              {wakingRetry ? (
                <>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {wakingRetry === "busy" ? "Server's busy — retrying…" : "Waking up the server…"}
                  </p>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    {wakingRetry === "busy"
                      ? "A lot of requests just now. Easing off and holding your search — it'll run automatically."
                      : "It napped (free hosting). Holding your search — it'll run automatically in a few seconds."}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">Agents at work</p>
                  <p className="truncate text-sm text-ink-500">{AGENT_STEPS[step]}</p>
                </>
              )}
            </div>
          </div>
          <SkeletonCards n={4} />
        </>
      )}

      {/* ---------- Results ---------- */}
      {res && !loading && (
        <>
          <div className="card relative z-[25] flex flex-wrap items-center gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">
                {totalResults} results for{" "}
                <span className="text-brand-600 dark:text-brand-400">“{res.query}”</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                {res.agents_run.length} agents · {res.elapsed_ms} ms
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                onClick={async () => {
                  if (!localStorage.getItem("rp_token")) {
                    toast("Sign in to save searches.", "info");
                    return;
                  }
                  await api.saveSearch(res.query, res.agents_run);
                  toast("Search saved to your dashboard.", "success");
                }}
              >
                <Icon.star className="h-4 w-4" /> Save search
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toast("Shareable link copied.", "success");
                }}
              >
                <Icon.share className="h-4 w-4" /> Share
              </button>
              <a className="btn-ghost" href={`/graph?q=${encodeURIComponent(res.query)}`}>
                <Icon.network className="h-4 w-4" /> Citation network
              </a>
              <ExportMenu query={res.query} />
            </div>
          </div>

          {/* Trend chart */}
          {trends.length > 0 && (
            <div className="card animate-fade-up p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon.trend className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">Publication trend</p>
                  <p className="text-xs text-ink-400">Papers published per year on this topic</p>
                </div>
              </div>
              <div className="mt-2">
                <TrendChart series={trends} />
              </div>
            </div>
          )}

          {/* AI proposal generator — surfaced so it's discoverable */}
          {res.papers.length > 0 && <ProposalBanner topic={res.query} />}

          {/* Sticky tabs */}
          <div id="results-top" role="tablist" aria-label="Result categories" className="sticky top-[76px] z-20 -mx-1 overflow-x-auto rounded-xl border border-ink-200/60 bg-white/80 px-1 py-1.5 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/70">
            <div className="flex gap-1">
              {TABS.map((t) => {
                const n = count(res, t.key);
                const active = tab === t.key;
                const TabIcon = t.icon;
                return (
                  <button key={t.key} role="tab" aria-selected={active} onClick={() => setTab(t.key)} disabled={n === 0}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-brand-500 text-white shadow-soft"
                        : n === 0 ? "cursor-not-allowed text-ink-300 dark:text-ink-700"
                        : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                    }`}>
                    <TabIcon className="h-4 w-4" />
                    {t.label}
                    {n > 0 && (
                      <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white/25" : "bg-ink-100 text-ink-500 dark:bg-ink-800"}`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters — only meaningful for the papers tab */}
          {tab === "papers" && res.papers.length > 0 && (
            <Filters
              papers={res.papers}
              filters={filters}
              setFilters={setFilters}
              open={filtersOpen}
              onToggleOpen={() => setFiltersOpen((o) => !o)}
            />
          )}

          <div className="stagger grid gap-4">
            {tab === "papers" &&
              (() => {
                const shown = applyFilters(res.papers, filters);
                if (shown.length === 0) {
                  return (
                    <EmptyState
                      title="No papers match your filters"
                      hint="Loosen a filter or clear them all to see results again."
                    />
                  );
                }
                const PAGE_SIZE = 15;
                const pageCount = Math.ceil(shown.length / PAGE_SIZE);
                const page = Math.min(papersPage, pageCount - 1);
                const start = page * PAGE_SIZE;
                const pageItems = shown.slice(start, start + PAGE_SIZE);
                const goPage = (p: number) => {
                  setPapersPage(p);
                  document
                    .getElementById("results-top")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                };
                return (
                  <>
                    <p className="-mb-1 text-xs text-ink-400">
                      Showing{" "}
                      <b className="text-ink-600 dark:text-ink-300">
                        {start + 1}–{start + pageItems.length}
                      </b>{" "}
                      of {shown.length} papers
                    </p>
                    {pageItems.map((p, i) => (
                      <div key={`${p.title}-${start + i}`} style={{ ["--i" as any]: i }}>
                        <PaperCard p={p} />
                      </div>
                    ))}
                    {pageCount > 1 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          onClick={() => goPage(page - 1)}
                          disabled={page === 0}
                          className="btn-ghost disabled:opacity-40"
                        >
                          ← Prev
                        </button>
                        <span className="px-2 text-sm font-medium text-ink-500">
                          Page {page + 1} of {pageCount}
                        </span>
                        <button
                          onClick={() => goPage(page + 1)}
                          disabled={page >= pageCount - 1}
                          className="btn-ghost disabled:opacity-40"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            {tab === "chat" && res.papers.length > 0 && (
              <ChatPanel topic={res.query} papers={res.papers} />
            )}
            {tab === "review" && res.literature_review && <ReviewPanel r={res.literature_review} />}
            {tab === "gaps" && res.research_gaps && <GapsPanel g={res.research_gaps} />}
            {tab === "datasets" && res.datasets.map((d, i) => <div key={i} style={{ ["--i" as any]: i }}><DatasetCard d={d} /></div>)}
            {tab === "code" && res.repositories.map((r, i) => <div key={i} style={{ ["--i" as any]: i }}><RepoCard r={r} /></div>)}
            {tab === "grants" && res.grants.map((g, i) => <div key={i} style={{ ["--i" as any]: i }}><GrantCard g={g} /></div>)}
            {tab === "conferences" && res.conferences.map((c, i) => <div key={i} style={{ ["--i" as any]: i }}><ConferenceCard c={c} /></div>)}
            {tab === "patents" && res.patents.map((p, i) => <div key={i} style={{ ["--i" as any]: i }}><PatentCard p={p} /></div>)}
            {tab === "collaborators" && res.collaborators.map((c, i) => <div key={i} style={{ ["--i" as any]: i }}><CollaboratorCard c={c} /></div>)}
            {tab !== "papers" && count(res, tab) === 0 && (
              <EmptyState title="Nothing in this category"
                hint={`No ${tab} found for “${res.query}”. Try a broader or differently-worded query.`} />
            )}
          </div>
        </>
      )}

      {/* ---------- Landing (no results yet) ---------- */}
      {!res && !loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="stagger grid gap-3 sm:grid-cols-3">
              {[
                { icon: <Icon.paper className="h-5 w-5" />, t: "Discover & rank", d: "arXiv, Semantic Scholar, OpenAlex, PubMed & more — with seminal-paper detection." },
                { icon: <Icon.chat className="h-5 w-5" />, t: "Chat, review & propose", d: "Citation-grounded answers, a full literature review, and a ready-to-edit research proposal (PDF/Word)." },
                { icon: <Icon.grant className="h-5 w-5" />, t: "Funding & beyond", d: "Grants, CFPs, datasets, code, patents & collaborators in one go." },
              ].map((c, i) => (
                <div key={c.t} className="card card-hover group p-5" style={{ ["--i" as any]: i }}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-brand-600 transition group-hover:scale-105 dark:from-brand-500/15 dark:to-accent-500/15 dark:text-brand-300">
                    {c.icon}
                  </span>
                  <p className="mt-3 font-bold">{c.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{c.d}</p>
                </div>
              ))}
            </div>

            {/* Animated stats counter */}
            <Reveal>
              <StatsCounter />
            </Reveal>

            {/* What you can discover — fills the column & shows the breadth */}
            <div className="card p-5">
              <p className="mb-3 text-sm font-bold">One query finds it all</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { icon: <Icon.paper className="h-4 w-4" />, l: "Papers" },
                  { icon: <Icon.dataset className="h-4 w-4" />, l: "Datasets" },
                  { icon: <Icon.grant className="h-4 w-4" />, l: "Grants" },
                  { icon: <Icon.conf className="h-4 w-4" />, l: "Conferences" },
                  { icon: <Icon.code className="h-4 w-4" />, l: "Code" },
                  { icon: <Icon.patent className="h-4 w-4" />, l: "Patents" },
                  { icon: <Icon.people className="h-4 w-4" />, l: "Collaborators" },
                  { icon: <Icon.gap className="h-4 w-4" />, l: "Research gaps" },
                ].map((x) => (
                  <div key={x.l}
                    className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-800 dark:text-ink-300">
                    <span className="text-brand-500">{x.icon}</span>
                    {x.l}
                  </div>
                ))}
              </div>
            </div>

            {/* How it works — three quick steps */}
            <div className="card p-5">
              <p className="mb-3 text-sm font-bold">How it works</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { n: "1", t: "Ask in plain English", d: "Type a topic or a question — no operators needed." },
                  { n: "2", t: "Agents fan out", d: "Ten agents search and rank across live sources." },
                  { n: "3", t: "Get a synthesis", d: "Cited review, gaps, and everything organized." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.t}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trending sidebar */}
          <aside className="card animate-fade-up p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
                <Icon.trend className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">Trending research</p>
                <p className="text-xs text-ink-400">Hot topics right now</p>
              </div>
            </div>
            <ol className="space-y-0.5">
              {trending.slice(0, 10).map((t, i) => (
                <li key={t.topic}>
                  <button onClick={() => { setQ(t.topic); run(t.topic); }}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-brand-50/60 dark:hover:bg-brand-500/10">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold ${
                      i < 3
                        ? "bg-gradient-to-br from-brand-400 to-accent-500 text-white"
                        : "bg-ink-100 text-ink-400 dark:bg-ink-800"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-700 group-hover:text-brand-600 dark:text-ink-200">
                        {t.topic}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                          <span className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500"
                            style={{ width: `${t.heat}%` }} />
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-400">{t.tag}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-ink-100 pt-3 text-center text-xs text-ink-400 dark:border-ink-800">
              Press <kbd className="rounded border border-ink-200 px-1.5 py-0.5 font-sans dark:border-ink-700">⌘K</kbd> to quick-search
            </p>
          </aside>
        </div>
      )}

      {/* ---------- Closing CTA (landing only) ---------- */}
      {!res && !loading && !error && (
        <Reveal>
        <section
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-accent-600 to-brand-700 p-10 text-center text-white shadow-lift animate-gradient-pan sm:p-14"
          style={{ backgroundSize: "220% 220%" }}
        >
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 animate-blob bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 animate-blob-slow bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Start your next literature review in seconds.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">
              Free to use. No setup. Ten AI agents, live academic sources, and a
              cited review — from a single search.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Magnetic>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => (document.querySelector('input[aria-label="Search research"]') as HTMLInputElement)?.focus(), 450);
                  }}
                  className="btn cursor-pointer bg-white !px-6 !py-3 text-brand-700 shadow-lift transition-colors duration-200 hover:bg-brand-50"
                >
                  Try a search <Icon.arrowRight className="h-4 w-4" />
                </button>
              </Magnetic>
              <Magnetic>
                <a href="/login" className="btn cursor-pointer border border-white/30 bg-white/10 !px-6 !py-3 text-white backdrop-blur transition-colors duration-200 hover:bg-white/20">
                  Create a free account
                </a>
              </Magnetic>
            </div>
          </div>
        </section>
        </Reveal>
      )}
    </div>
  );
}
