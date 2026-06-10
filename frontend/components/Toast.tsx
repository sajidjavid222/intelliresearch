"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<(message: string, kind?: ToastKind) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastCtx);
}

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};
const STYLES: Record<ToastKind, string> = {
  success:
    "border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  error:
    "border-rose-300/60 bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  info: "border-brand-300/60 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift backdrop-blur ${STYLES[t.kind]}`}
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/60 text-xs font-bold dark:bg-white/10">
              {ICONS[t.kind]}
            </span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
