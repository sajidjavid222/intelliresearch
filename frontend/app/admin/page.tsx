"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Counter } from "@/components/Charts";

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-gradient">
        <Counter value={value} />
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

function MiniBars({ series }: { series: { day: string; count: number }[] }) {
  if (!series?.length) return <p className="text-sm text-ink-400">No signups in the last 14 days.</p>;
  const max = Math.max(...series.map((s) => s.count), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 90 }}>
      {series.map((s) => (
        <div key={s.day} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t bg-gradient-to-t from-brand-500 to-accent-400"
              style={{ height: `${Math.max(6, (s.count / max) * 100)}%` }}
              title={`${s.day}: ${s.count}`} />
          </div>
          <span className="text-[9px] text-ink-400">{s.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Restore a saved admin password and auto-load.
  useEffect(() => {
    const saved = localStorage.getItem("rp_admin");
    if (saved) { setToken(saved); load(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(t: string) {
    setLoading(true);
    setError("");
    try {
      const d = await api.adminStats(t);
      setData(d);
      setToken(t);
      localStorage.setItem("rp_admin", t);
    } catch (e: any) {
      setError(e.message?.includes("401") || e.message?.includes("Invalid")
        ? "Wrong password."
        : "Could not load stats (is ADMIN_TOKEN set on the server?).");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("rp_admin");
    setToken(""); setData(null); setPw("");
  }

  // ---- Password gate ----
  if (!data) {
    return (
      <div className="mx-auto mt-16 max-w-sm">
        <div className="card p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white">
            🔒
          </div>
          <h1 className="mt-3 text-lg font-bold">Admin analytics</h1>
          <p className="mt-1 text-sm text-ink-400">Enter the admin password to view usage.</p>
          <input
            type="password"
            className="input mt-4"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(pw)}
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <button className="btn-primary mt-3 w-full" onClick={() => load(pw)} disabled={loading}>
            {loading ? "Checking…" : "View dashboard"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Dashboard ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Usage analytics</h1>
          <p className="text-sm text-ink-400">
            Updated {new Date(data.generated_at).toLocaleString()} ·{" "}
            <button onClick={() => load(token)} className="text-brand-600 hover:underline">refresh</button>
          </p>
        </div>
        <button onClick={logout} className="btn-ghost">Lock</button>
      </div>

      {/* Users */}
      <div>
        <p className="mb-2 text-sm font-bold text-ink-500">Users</p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total users" value={data.users.total} />
          <StatCard label="New today" value={data.users.today} />
          <StatCard label="New this week" value={data.users.this_week} />
        </div>
      </div>

      {/* Searches */}
      <div>
        <p className="mb-2 text-sm font-bold text-ink-500">Searches (signed-in)</p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total searches" value={data.searches.total} />
          <StatCard label="Today" value={data.searches.today} />
          <StatCard label="This week" value={data.searches.this_week} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Signups chart + engagement */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <p className="mb-3 text-sm font-bold">Signups · last 14 days</p>
            <MiniBars series={data.signups_series} />
          </div>

          <div className="card p-5">
            <p className="mb-3 text-sm font-bold">Recent signups</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2">Name</th><th>Email</th><th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_signups.map((u: any, i: number) => (
                    <tr key={i} className="border-t border-ink-100 dark:border-ink-800">
                      <td className="py-2 font-medium">{u.name || "—"}</td>
                      <td className="text-ink-500">{u.email}</td>
                      <td className="text-ink-400">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {data.recent_signups.length === 0 && (
                    <tr><td colSpan={3} className="py-3 text-center text-ink-400">No users yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-sm font-bold">Recent searches</p>
            <ul className="space-y-1 text-sm">
              {data.recent_searches.map((s: any, i: number) => (
                <li key={i} className="flex justify-between gap-3 border-t border-ink-100 py-1.5 first:border-0 dark:border-ink-800">
                  <span className="truncate">{s.query}</span>
                  <span className="shrink-0 text-xs text-ink-400">{s.at ? new Date(s.at).toLocaleString() : ""}</span>
                </li>
              ))}
              {data.recent_searches.length === 0 && <li className="text-ink-400">No searches logged yet.</li>}
            </ul>
          </div>
        </div>

        {/* Top topics + engagement */}
        <div className="space-y-6">
          <div className="card p-5">
            <p className="mb-3 text-sm font-bold">🔥 Most-searched topics</p>
            <ol className="space-y-2">
              {data.top_topics.map((t: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-xs font-bold text-ink-300">{i + 1}</span>
                    <span className="truncate">{t.topic}</span>
                  </span>
                  <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{t.count}</span>
                </li>
              ))}
              {data.top_topics.length === 0 && <li className="text-ink-400">No data yet.</li>}
            </ol>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-sm font-bold">Engagement</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                ["Saved items", data.engagement.saved_items],
                ["Collections", data.engagement.collections],
                ["Subscriptions", data.engagement.subscriptions],
                ["Alerts", data.engagement.alerts],
              ].map(([l, v]: any) => (
                <div key={l} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <p className="text-xl font-bold">{v}</p>
                  <p className="text-xs text-ink-400">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
