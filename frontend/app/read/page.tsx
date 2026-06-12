"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { PdfMeta, PdfSource } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: PdfSource[];
}

const SUGGESTIONS = [
  "Summarize this paper in 5 bullet points",
  "What are the key contributions?",
  "What methods and datasets are used?",
  "What are the limitations or open questions?",
];

const MAX_MB = 20;

export default function ReadPage() {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [page, setPage] = useState<number | null>(null);
  const [meta, setMeta] = useState<PdfMeta | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  // Revoke the object URL when it changes / on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast("Please choose a PDF file.", "error");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`PDF is too large (max ${MAX_MB} MB).`, "error");
      return;
    }
    // Show the PDF immediately from the local file; upload text in parallel.
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(file));
    setPage(null);
    setMessages([]);
    setMeta(null);
    setUploading(true);
    try {
      const m = await api.uploadPdf(file);
      setMeta(m);
      if (!m.extractable) {
        toast("This PDF looks scanned — text couldn't be extracted.", "info");
      }
    } catch (e: any) {
      toast(e?.message || "Could not process this PDF.", "error");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || !meta || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setSending(true);
    try {
      const r = await api.pdfChat(meta.doc_id, q);
      setMessages((m) => [...m, { role: "assistant", text: r.answer, sources: r.sources }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: e?.message || "Something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    setMeta(null);
    setMessages([]);
    setPage(null);
  }

  const iframeSrc = pdfUrl ? `${pdfUrl}#page=${page || 1}&view=FitH` : "";

  /* ----------------------------- Empty state ----------------------------- */
  if (!pdfUrl) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <span className="chip mx-auto bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
            <Icon.chat className="h-3.5 w-3.5" /> Chat with PDF
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Read &amp; chat with any paper
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-ink-500">
            Upload a PDF to read it side-by-side with an AI that answers your questions —
            grounded in the document, with page citations.
          </p>
        </header>

        <button
          onClick={() => fileInput.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`card flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-16 text-center transition ${
            dragOver
              ? "border-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
              : "border-ink-200 hover:border-brand-300 dark:border-ink-700"
          }`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow">
            <Icon.download className="h-6 w-6 rotate-180" />
          </span>
          <span className="text-base font-semibold">
            Drop a PDF here, or click to browse
          </span>
          <span className="text-xs text-ink-400">Up to {MAX_MB} MB · stays private to your session</span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  /* ----------------------------- Reader + chat ----------------------------- */
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Reader */}
      <section className="lg:col-span-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold" title={meta?.title}>
              {meta?.title || meta?.filename || "Document"}
            </h1>
            {meta && (
              <p className="text-xs text-ink-400">
                {meta.pages} pages · {meta.word_count.toLocaleString()} words
              </p>
            )}
          </div>
          <button onClick={reset} className="btn-ghost shrink-0">
            <Icon.close className="h-4 w-4" /> New PDF
          </button>
        </div>
        <div className="card overflow-hidden p-0">
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title="PDF reader"
            className="h-[78vh] w-full"
          />
        </div>
      </section>

      {/* Chat */}
      <section className="flex h-[calc(78vh+3rem)] flex-col lg:col-span-2">
        <div className="card flex min-h-0 flex-1 flex-col p-0">
          <div className="flex items-center gap-2 border-b border-ink-100 p-4 dark:border-ink-800">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white">
              <Icon.sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold leading-tight">Ask this paper</h2>
              <p className="text-[11px] text-ink-400">Answers cite the pages they came from</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                {meta && !meta.extractable && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    This PDF appears to be scanned (images), so text answers may be limited.
                  </div>
                )}
                <p className="text-sm text-ink-400">Try asking…</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      disabled={!meta}
                      className="rounded-xl border border-ink-100 px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50 dark:border-ink-800 dark:hover:bg-brand-500/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand-500 text-white"
                      : "bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink-200/60 pt-2 dark:border-ink-700/60">
                      {m.sources.map((s) => (
                        <button
                          key={s.n}
                          onClick={() => setPage(s.page)}
                          title={s.snippet}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 dark:bg-ink-800 dark:text-brand-300"
                        >
                          <Icon.paper className="h-3 w-3" /> p.{s.page}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                Reading the document…
              </div>
            )}
          </div>

          {/* References (collapsible) */}
          {meta && meta.references.length > 0 && (
            <div className="border-t border-ink-100 dark:border-ink-800">
              <button
                onClick={() => setShowRefs((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-ink-500 transition hover:text-brand-600"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.review className="h-3.5 w-3.5" /> {meta.references.length} references
                </span>
                <span>{showRefs ? "Hide" : "Show"}</span>
              </button>
              {showRefs && (
                <ol className="max-h-44 list-decimal space-y-1.5 overflow-y-auto px-7 pb-3 text-[11px] leading-relaxed text-ink-500">
                  {meta.references.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-ink-100 p-3 dark:border-ink-800">
            <div className="flex items-end gap-2">
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
                placeholder={uploading ? "Processing PDF…" : "Ask about this paper…"}
                disabled={!meta || sending}
                className="input max-h-28 flex-1 resize-none disabled:opacity-60"
              />
              <button
                onClick={() => ask(input)}
                disabled={!meta || sending || !input.trim()}
                className="btn-primary shrink-0 !px-3"
                aria-label="Send"
              >
                <Icon.arrowUp className="h-4 w-4" />
              </button>
            </div>
            {uploading && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                Extracting text so you can chat…
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
