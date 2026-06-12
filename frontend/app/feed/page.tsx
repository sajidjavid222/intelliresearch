"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, withColdStartRetry } from "@/lib/api";
import type { Deadline, FeedResponse, User } from "@/lib/types";
import { PaperCard, GrantCard } from "@/components/Cards";
import { EmptyState, Icon, SkeletonCards } from "@/components/ui";

/* ----------------------------- helpers ----------------------------- */
function fmtDate(iso: string | null): string {
  if (!iso) return "Rolling · no fixed date";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "Rolling · no fixed date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function countdown(days: number | null): { label: string; cls: string } {
  if (days == null)
    return { label: "Rolling", cls: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300" };
  if (days <= 0)
    return { label: "Today", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" };
  if (days === 1)
    return { label: "1 day left", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" };
  if (days <= 7)
    return { label: `${days} days left`, cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" };
  if (days <= 30)
    return { label: `${days} days left`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" };
  return { label: `${days} days left`, cls: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" };
}

/* --------------------------- deadline row --------------------------- */
function DeadlineRow({ d }: { d: Deadline }) {
  const c = countdown(d.days_left);
  const Body = (
    <div className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/40 dark:hover:bg-brand-500/10">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          d.kind === "grant"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
        }`}
      >
        {d.kind === "grant" ? <Icon.grant className="h-4 w-4" /> : <Icon.conf className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{d.title}</p>
        <p className="truncate text-xs text-ink-400">
          <span className="capitalize">{d.kind}</span>
          {d.org ? ` · ${d.org}` : ""} · {fmtDate(d.date)}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.cls}`}>
        {c.label}
      </span>
    </div>
  );
  return d.url ? (
    <a href={d.url} target="_blank" rel="noreferrer" className="block">
      {Body}
    </a>
  ) : (
    <div>{Body}</div>
  );
}

/* ------------------------------ section ----------------------------- */
function SectionHead({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <span className="text-brand-500">{icon}</span> {title}
      </h2>
      {hint && <span className="text-xs text-ink-400">{hint}</span>}
    </div>
  );
}

/* ------------------------------- page ------------------------------- */
export default function FeedPage() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("rp_token")) {
      api.me().then(setUser).catch(() => {});
    }
    withColdStartRetry(() => api.feed())
      .then(setFeed)
      .catch(() => setError(true));
  }, []);

  const needsProfile = !user?.research_interests?.trim();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="card relative overflow-hidden p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-blob rounded-full bg-gradient-to-br from-brand-300/40 to-accent-300/40 blur-2xl"
        />
        <div className="relative">
          <span className="chip bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
            <Icon.sparkles className="h-3.5 w-3.5" /> Personalized
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">For You</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            A daily hub tuned to your research — fresh papers, matching grants, and the
            deadlines you can&apos;t afford to miss.
          </p>
          {feed && feed.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-ink-400">Tuned to:</span>
              {feed.topics.map((t) => (
                <span
                  key={t}
                  className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Personalize nudge */}
      {feed && needsProfile && (
        <div className="card flex flex-col items-start justify-between gap-3 border-brand-200/70 bg-gradient-to-r from-brand-50/60 to-accent-50/50 p-4 dark:border-brand-500/20 dark:from-brand-500/10 dark:to-accent-500/10 sm:flex-row sm:items-center">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            {user
              ? "Add your research interests to sharpen these recommendations."
              : "Sign in and add your research interests to personalize this feed."}
          </p>
          <Link href={user ? "/dashboard" : "/login"} className="btn-primary shrink-0">
            {user ? "Edit profile" : "Sign in"} <Icon.arrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Error */}
      {error && !feed && (
        <EmptyState
          icon={<Icon.sparkles className="h-5 w-5" />}
          title="Couldn't load your feed"
          hint="The server may be waking up. Refresh in a few seconds."
        />
      )}

      {/* Loading */}
      {!feed && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonCards n={3} />
          </div>
          <div className="card p-4">
            <div className="skeleton mb-3 h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton mb-2 h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {feed && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main column: recommended papers */}
          <section className="lg:col-span-2">
            <SectionHead
              icon={<Icon.paper className="h-5 w-5" />}
              title="Recommended papers"
              hint={feed.papers.length ? `${feed.papers.length} picks` : undefined}
            />
            {feed.papers.length ? (
              <div className="grid gap-4">
                {feed.papers.map((p, i) => (
                  <PaperCard key={`${p.title}-${i}`} p={p} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Icon.paper className="h-5 w-5" />}
                title="No recommendations yet"
                hint="Add research interests to your profile to see tailored papers."
              />
            )}
          </section>

          {/* Sidebar: deadlines + grants */}
          <aside className="space-y-8">
            <section>
              <SectionHead icon={<Icon.calendar className="h-5 w-5" />} title="Upcoming deadlines" />
              {feed.deadlines.length ? (
                <div className="card divide-y divide-ink-100 overflow-hidden p-0 dark:divide-ink-800">
                  {feed.deadlines.map((d, i) => (
                    <DeadlineRow key={i} d={d} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Icon.calendar className="h-5 w-5" />}
                  title="No deadlines found"
                  hint="Grant & conference deadlines for your topics will show up here."
                />
              )}
            </section>

            {feed.grants.length > 0 && (
              <section>
                <SectionHead icon={<Icon.grant className="h-5 w-5" />} title="Matching grants" />
                <div className="grid gap-4">
                  {feed.grants.map((g, i) => (
                    <GrantCard key={`${g.title}-${i}`} g={g} />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
