"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui";
import { Markdown } from "@/components/Markdown";

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: { n: number; title: string; year?: number; url?: string }[];
}

const SUGGESTIONS = [
  "What methods do my saved papers use?",
  "Summarize the key findings across my library",
  "What gaps or limitations recur?",
];

export function LibraryChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const r = await api.libraryChat(question);
      setMsgs((m) => [...m, { role: "assistant", text: r.answer, sources: r.sources }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white">
          <Icon.sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">
            Chat with your library
          </h2>
          <p className="text-xs text-ink-400">
            Ask across every paper you&apos;ve saved — answers cite the sources.
          </p>
        </div>
      </div>

      <div ref={scroller} className="max-h-80 space-y-3 overflow-y-auto">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-ink-200/70 bg-white/60 px-3 py-1.5 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100"
              }`}
            >
              {m.role === "assistant" ? (
                <Markdown text={m.text} />
              ) : (
                <p className="whitespace-pre-line">{m.text}</p>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink-200/60 pt-2 dark:border-ink-700/60">
                  {m.sources.map((s) => (
                    <a
                      key={s.n}
                      href={s.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      title={s.title}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 dark:bg-ink-800 dark:text-brand-300"
                    >
                      [{s.n}] {s.title.slice(0, 30)}
                      {s.title.length > 30 ? "…" : ""}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            Reading your library…
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          rows={1}
          placeholder="Ask your saved papers…"
          className="input max-h-28 flex-1 resize-none"
        />
        <button
          onClick={() => ask(input)}
          disabled={busy || !input.trim()}
          className="btn-primary shrink-0 !px-3"
          aria-label="Send"
        >
          <Icon.arrowUp className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
