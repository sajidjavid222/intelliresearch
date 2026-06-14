"use client";

import { useEffect, useState } from "react";
import {
  ACCENTS,
  applyAccent,
  applyDensity,
  getSavedAccent,
  getSavedDensity,
  type AccentName,
  type Density,
} from "@/lib/accent";

export function Appearance() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState<AccentName>("teal");
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    setAccent(getSavedAccent());
    setDensity(getSavedDensity());
  }, []);

  const current = ACCENTS.find((a) => a.name === accent) || ACCENTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Appearance"
        title="Accent & density"
        className="btn-ghost h-9 w-9 !px-0"
      >
        <span
          className="h-4 w-4 rounded-full ring-2 ring-white/70 dark:ring-white/10"
          style={{ background: current.swatch }}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-ink-200/70 bg-white p-3 shadow-lift dark:border-ink-800 dark:bg-ink-900">
            <p className="label">Accent color</p>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.name}
                  onClick={() => {
                    applyAccent(a.name);
                    setAccent(a.name);
                  }}
                  aria-label={a.label}
                  title={a.label}
                  className={`h-7 w-7 rounded-full transition ${
                    accent === a.name
                      ? "ring-2 ring-ink-400 ring-offset-2 dark:ring-offset-ink-900"
                      : "hover:scale-110"
                  }`}
                  style={{ background: a.swatch }}
                />
              ))}
            </div>

            <p className="label mt-4">Density</p>
            <div className="flex gap-1.5 rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
              {(["comfortable", "compact"] as Density[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    applyDensity(d);
                    setDensity(d);
                  }}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition ${
                    density === d
                      ? "bg-white text-ink-800 shadow-sm dark:bg-ink-700 dark:text-ink-100"
                      : "text-ink-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
