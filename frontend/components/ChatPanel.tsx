"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Paper } from "@/lib/types";
import { Icon } from "@/components/ui";
import { Markdown } from "@/components/Markdown";

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: any[];
}

const SUGGESTIONS = [
  "What are the main methods used?",
  "What are the open research gaps?",
  "Which datasets are commonly used?",
  "Summarize the key findings.",
];

export function ChatPanel({ topic, papers }: { topic: string; papers: Paper[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      // Send a trimmed payload (title + abstract is enough for grounding).
      const slim = papers.slice(0, 15).map((p) => ({
        title: p.title,
        abstract: p.abstract,
        year: p.year,
        venue: p.venue,
        url: p.url,
        citation_count: p.citation_count,
        fields_of_study: p.fields_of_study,
      }));
      const r = await api.chat(q, topic, slim);
      setMsgs((m) => [...m, { role: "assistant", text: r.answer, sources: r.sources }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "Sorry — I couldn't answer that. Try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }),
        50
      );
    }
  }

  return (
    <div className="card animate-fade-up flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <Icon.chat className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold">Chat with these papers</h3>
          <p className="text-xs text-ink-400">
            Answers grounded in your {papers.length} search results · cited inline
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[440px] space-y-4 overflow-y-auto px-5 py-4">
        {msgs.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-ink-400">
              Ask anything about the papers in your results.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="chip border border-ink-200 bg-white text-ink-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100"
              }`}
            >
              {m.role === "assistant" ? (
                <Markdown text={m.text} />
              ) : (
                <p className="whitespace-pre-line">{m.text}</p>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-200/40 pt-2 dark:border-ink-700">
                  {m.sources.map((s) => (
                    <a
                      key={s.n}
                      href={s.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      title={s.title}
                      className="chip bg-white/70 text-[11px] text-ink-600 transition hover:text-brand-600 dark:bg-ink-900/60 dark:text-ink-300"
                    >
                      [{s.n}] {s.title.slice(0, 32)}
                      {s.title.length > 32 ? "…" : ""}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-ink-100 px-4 py-3 dark:bg-ink-800">
              <span className="h-2 w-2 animate-bounce rounded-full bg-ink-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-ink-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-ink-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-ink-100 px-4 py-3 dark:border-ink-800">
        <div className="relative flex-1">
          <input
            className="input pr-10"
            placeholder="Ask a question about these papers…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            disabled={loading}
          />
        </div>
        <button className="btn-primary" onClick={() => ask(input)} disabled={loading || !input.trim()}>
          <Icon.search className="h-4 w-4" /> Ask
        </button>
      </div>
    </div>
  );
}
