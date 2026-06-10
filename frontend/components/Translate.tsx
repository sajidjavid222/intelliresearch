"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

// Cache languages once per session.
let LANG_CACHE: { code: string; name: string }[] | null = null;

/**
 * A compact "Translate" control. Given source `text`, it shows a language
 * dropdown; picking one calls the backend and renders the translation, with a
 * toggle back to the original.
 */
export function TranslateButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const toast = useToast();
  const [langs, setLangs] = useState<{ code: string; name: string }[]>(LANG_CACHE || []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [langName, setLangName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!LANG_CACHE) {
      api.languages().then((l) => { LANG_CACHE = l; setLangs(l); }).catch(() => {});
    }
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function pick(code: string, name: string) {
    setOpen(false);
    setLoading(true);
    setLangName(name);
    try {
      const r = await api.translate(text, code);
      setTranslated(r.translation);
    } catch {
      toast("Translation failed — is an LLM key set?", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <div className="relative inline-flex items-center gap-2" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
        >
          🌐 {loading ? "Translating…" : "Translate"}
        </button>
        {translated && (
          <button
            onClick={() => setTranslated(null)}
            className="text-xs text-ink-400 hover:text-ink-600"
          >
            Show original
          </button>
        )}
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-44 animate-scale-in overflow-auto rounded-xl border border-ink-200/70 bg-white py-1 shadow-lift dark:border-ink-800 dark:bg-ink-900">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code, l.name)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-500/10"
              >
                {l.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {translated && (
        <div className="mt-2 rounded-lg border border-brand-200/60 bg-brand-50/40 p-3 text-sm leading-relaxed text-ink-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-ink-200">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
            {langName}
          </p>
          <p className="whitespace-pre-line">{translated}</p>
        </div>
      )}
    </div>
  );
}
