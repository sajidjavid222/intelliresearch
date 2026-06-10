"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui";

type Trend = { topic: string; tag: string; heat: number };

const QUICK = [
  { label: "Go to Search", href: "/", icon: Icon.search },
  { label: "Go to Dashboard", href: "/dashboard", icon: Icon.review },
  { label: "Sign in", href: "/login", icon: Icon.people },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [trends, setTrends] = useState<Trend[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K toggle + "/" focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      if (!trends.length) api.trending().then(setTrends).catch(() => {});
    } else {
      setQ("");
      setActive(0);
    }
  }, [open]);

  function go(query: string) {
    setOpen(false);
    router.push(`/?q=${encodeURIComponent(query)}`);
    // Notify the search page (same route) to run the query.
    window.dispatchEvent(new CustomEvent("rp:search", { detail: query }));
  }

  const filtered = trends.filter((t) =>
    t.topic.toLowerCase().includes(q.toLowerCase())
  );
  const showQuick = QUICK.filter((x) =>
    x.label.toLowerCase().includes(q.toLowerCase())
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 dark:border-ink-800">
          <Icon.search className="h-4 w-4 text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              const max = filtered.length + showQuick.length;
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, max - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter") {
                if (active < showQuick.length) {
                  setOpen(false);
                  router.push(showQuick[active].href);
                } else if (q.trim()) {
                  const t = filtered[active - showQuick.length];
                  go(t ? t.topic : q);
                }
              }
            }}
            placeholder="Search topics or jump to a page…"
            className="flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded border border-ink-200 px-1.5 py-0.5 text-[10px] text-ink-400 dark:border-ink-700">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {q && (
            <button
              onClick={() => go(q)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-500/10"
            >
              <Icon.search className="h-4 w-4 text-brand-500" />
              Search for <span className="font-semibold">“{q}”</span>
            </button>
          )}

          {showQuick.length > 0 && (
            <div className="mt-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Navigate
              </p>
              {showQuick.map((item, i) => {
                const I = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => { setOpen(false); router.push(item.href); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                      active === i ? "bg-ink-100 dark:bg-ink-800" : "hover:bg-ink-50 dark:hover:bg-ink-800/50"
                    }`}
                  >
                    <I className="h-4 w-4 text-ink-400" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-1">
            <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Trending topics
            </p>
            {filtered.map((t, i) => {
              const idx = i + showQuick.length;
              return (
                <button
                  key={t.topic}
                  onClick={() => go(t.topic)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    active === idx ? "bg-ink-100 dark:bg-ink-800" : "hover:bg-ink-50 dark:hover:bg-ink-800/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">🔥</span>
                    {t.topic}
                  </span>
                  <span className="chip-muted text-[10px]">{t.tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
