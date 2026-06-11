"use client";

import { useEffect, useState } from "react";

/**
 * Free-tier hosts (Render) sleep after idle and take ~30–60s to cold-start.
 * On load we quietly ping the backend; if it's asleep we show a friendly
 * "waking up" banner and keep retrying, then confirm once it's ready.
 * If the backend is already warm, nothing ever appears.
 */
export function ServerWaking() {
  const [waking, setWaking] = useState(false);
  const [justWoke, setJustWoke] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ping(): Promise<boolean> {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        const r = await fetch("/api/health", { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(timer);
        return r.ok;
      } catch {
        return false;
      }
    }

    (async () => {
      // Quick first check — if warm, we're done and show nothing.
      if (await ping()) return;
      if (cancelled) return;

      // Backend is cold: show the banner and keep retrying until it's up.
      setWaking(true);
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
        if (await ping()) {
          if (cancelled) return;
          setWaking(false);
          setJustWoke(true);
          setTimeout(() => { if (!cancelled) setJustWoke(false); }, 2800);
          return;
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!waking && !justWoke) return null;

  return (
    <div className="fixed left-1/2 top-[70px] z-40 w-[min(92vw,460px)] -translate-x-1/2 animate-fade-up">
      {waking ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/95 px-4 py-3 text-sm shadow-lift backdrop-blur dark:border-amber-500/30 dark:bg-amber-500/15">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
          <div className="text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Waking up the server… 😴</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
              It naps when idle (free hosting) — first load takes ~30–60s. Hang tight!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/95 px-4 py-3 text-sm shadow-lift backdrop-blur dark:border-emerald-500/30 dark:bg-emerald-500/15">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ✓
          </span>
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">
            Server's awake — you're good to go!
          </p>
        </div>
      )}
    </div>
  );
}
