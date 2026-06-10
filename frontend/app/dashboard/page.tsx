"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { EmptyState, Icon } from "@/components/ui";
import { ProfileEditor } from "@/components/ProfileEditor";
import { Collections } from "@/components/Collections";

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [searches, setSearches] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rp_token")) {
      router.push("/login");
      return;
    }
    refresh();
  }, []);

  async function refresh() {
    try {
      const [u, it, sb, al, hi, se] = await Promise.all([
        api.me(), api.listItems(), api.listSubscriptions(),
        api.listAlerts(), api.history(), api.listSearches(),
      ]);
      setUser(u);
      setItems(it); setSubs(sb); setAlerts(al); setHistory(hi); setSearches(se);
    } catch {
      router.push("/login");
    }
  }

  async function addSub() {
    if (!newTopic.trim()) return;
    await api.subscribe(newTopic);
    toast(`Now monitoring “${newTopic}”.`, "success");
    setNewTopic("");
    refresh();
  }

  async function runMonitoring() {
    setBusy(true);
    const r: any = await api.runMonitoring();
    await refresh();
    setBusy(false);
    toast(`Checked ${r.subscriptions_checked ?? 0} topics · ${r.alerts_created ?? 0} new alerts.`, "info");
  }


  if (!user) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-ink-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        Loading your dashboard…
      </div>
    );
  }

  const unread = alerts.filter((a) => !a.read).length;
  const stats = [
    { label: "Saved items", value: items.length, icon: <Icon.star className="h-4 w-4" /> },
    { label: "Monitored topics", value: subs.length, icon: <Icon.bell className="h-4 w-4" /> },
    { label: "Alerts", value: alerts.length, icon: <Icon.bell className="h-4 w-4" /> },
    { label: "History", value: history.length, icon: <Icon.review className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-lg font-bold text-white">
            {(user.name || user.email)[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {user.name ? `Hi, ${user.name.split(" ")[0]}` : "Your dashboard"}
            </h1>
            <p className="text-sm text-ink-400">
              {[user.role, user.institution].filter(Boolean).join(" · ") || user.email}
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={runMonitoring} disabled={busy}>
          <Icon.bell className="h-4 w-4" />
          {busy ? "Checking…" : "Check for updates"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between text-ink-400">
              <span className="text-xs font-medium uppercase tracking-wide">{s.label}</span>
              {s.icon}
            </div>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile (full width) */}
      <ProfileEditor user={user} onSaved={setUser} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Alerts */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Icon.bell className="h-5 w-5 text-brand-500" /> Alerts
                {unread > 0 && (
                  <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    {unread} new
                  </span>
                )}
              </h2>
            </div>
            <div className="space-y-2">
              {alerts.length === 0 && (
                <EmptyState
                  icon={<Icon.bell className="h-5 w-5" />}
                  title="No alerts yet"
                  hint="Subscribe to a topic below, then hit “Check for updates”."
                />
              )}
              {alerts.slice(0, 12).map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 text-sm transition ${
                    a.read
                      ? "border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900/40"
                      : "border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="chip-muted text-[11px] capitalize">{a.kind.replace("_", " ")}</span>
                    {!a.read && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </div>
                  <p className="mt-1 font-semibold text-ink-800 dark:text-ink-100">{a.title}</p>
                  <p className="text-ink-500">{a.message}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Library & collections */}
          <Collections />

          {/* History */}
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Icon.review className="h-5 w-5 text-ink-400" /> Recent searches
            </h2>
            <ul className="space-y-1 text-sm">
              {history.length === 0 && <li className="text-ink-400">No history yet.</li>}
              {history.map((h, i) => {
                const isSearch = h.item_type === "search";
                const inner = (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      {isSearch && <Icon.search className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
                      <span className="truncate text-ink-600 group-hover:text-brand-600 dark:text-ink-300">
                        {h.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-400">
                      {isSearch ? "Rerun →" : new Date(h.viewed_at).toLocaleDateString()}
                    </span>
                  </>
                );
                return isSearch ? (
                  <li key={i}>
                    <a
                      href={`/?q=${encodeURIComponent(h.title)}`}
                      className="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-ink-50 dark:hover:bg-ink-900/40"
                    >
                      {inner}
                    </a>
                  </li>
                ) : (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                    {inner}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Saved searches */}
          {searches.length > 0 && (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Icon.search className="h-5 w-5 text-brand-500" /> Saved searches
              </h2>
              <div className="mt-3 space-y-1.5">
                {searches.map((s) => (
                  <a
                    key={s.id}
                    href={`/?q=${encodeURIComponent(s.query)}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition hover:bg-ink-50 dark:hover:bg-ink-800/50"
                  >
                    <span className="truncate">{s.query}</span>
                    <span className="shrink-0 text-xs font-semibold text-brand-600">Rerun →</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Subscriptions */}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon.bell className="h-5 w-5 text-brand-500" /> Monitored topics
            </h2>
            <div className="mt-3 flex gap-2">
              <input className="input" placeholder="Add a topic…"
                value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSub()} />
              <button className="btn-primary shrink-0" onClick={addSub}>Add</button>
            </div>
            <div className="mt-3 space-y-2">
              {subs.length === 0 && (
                <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-400 dark:bg-ink-900/40">
                  No subscriptions yet.
                </p>
              )}
              {subs.map((s) => (
                <div key={s.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-2.5 text-sm dark:border-ink-800">
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {s.topic}
                  </span>
                  <button
                    className="shrink-0 text-xs font-medium text-rose-500 hover:text-rose-600"
                    onClick={async () => { await api.unsubscribe(s.id); toast("Unsubscribed.", "info"); refresh(); }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
