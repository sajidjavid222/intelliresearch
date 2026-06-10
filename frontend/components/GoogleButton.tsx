"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Minimal typings for the Google Identity Services global.
declare global {
  interface Window {
    google?: any;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(s);
  });
}

export function GoogleButton({
  onSuccess,
  onError,
}: {
  onSuccess: (token: string, user: any) => void;
  onError: (msg: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cfg = await api.googleConfig();
        if (cancelled) return;
        if (!cfg.enabled || !cfg.client_id) {
          setEnabled(false);
          return;
        }
        setEnabled(true);
        await loadGis();
        if (cancelled || !divRef.current) return;

        window.google.accounts.id.initialize({
          client_id: cfg.client_id,
          callback: async (resp: { credential: string }) => {
            try {
              const r = await api.googleLogin(resp.credential);
              onSuccess(r.access_token, r.user);
            } catch (e: any) {
              onError(e.message || "Google sign-in failed");
            }
          },
        });
        window.google.accounts.id.renderButton(divRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "rectangular",
        });
      } catch (e: any) {
        if (!cancelled) {
          setEnabled(false);
          onError(e.message || "Could not initialize Google sign-in");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError]);

  // Hidden entirely when Google isn't configured on the server.
  if (enabled === false) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-xs text-ink-400">
        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        or continue with
        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>
      <div ref={divRef} className="flex justify-center" />
    </div>
  );
}
