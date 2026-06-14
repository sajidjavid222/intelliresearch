"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { PdfMeta } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { Reveal } from "@/components/Reveal";

interface Doc {
  localId: string;
  docId: string; // server id once uploaded
  name: string;
  url: string; // object URL
  meta: PdfMeta | null;
  status: "uploading" | "ready" | "error";
}

interface Source {
  n: number;
  page: number;
  snippet: string;
  doc_id: string;
  doc_title: string;
}
interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

const MAX_MB = 20;
const MAX_DOCS = 6;

const SUGGESTIONS = [
  "Summarize each paper in 2 lines",
  "Where do these papers agree and disagree?",
  "Compare their methods and datasets",
];

export default function ReadPage() {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [page, setPage] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const active = docs.find((d) => d.localId === activeId) || docs[0];
  const ready = docs.filter((d) => d.status === "ready" && d.docId);

  // Revoke all object URLs on unmount.
  const docsRef = useRef(docs);
  docsRef.current = docs;
  useEffect(() => () => docsRef.current.forEach((d) => URL.revokeObjectURL(d.url)), []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list);
    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast(`"${file.name}" isn't a PDF — skipped.`, "error");
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast(`"${file.name}" is too large (max ${MAX_MB} MB).`, "error");
        continue;
      }
      if (docsRef.current.length >= MAX_DOCS) {
        toast(`You can read up to ${MAX_DOCS} PDFs at once.`, "info");
        break;
      }
      const localId = Math.random().toString(36).slice(2);
      const url = URL.createObjectURL(file);
      setDocs((d) => [
        ...d,
        { localId, docId: "", name: file.name, url, meta: null, status: "uploading" },
      ]);
      setActiveId(localId);
      api
        .uploadPdf(file)
        .then((m) =>
          setDocs((d) =>
            d.map((x) =>
              x.localId === localId ? { ...x, docId: m.doc_id, meta: m, status: "ready" } : x
            )
          )
        )
        .catch(() => {
          toast(`Couldn't process "${file.name}".`, "error");
          setDocs((d) =>
            d.map((x) => (x.localId === localId ? { ...x, status: "error" } : x))
          );
        });
    }
  }

  function removeDoc(localId: string) {
    const d = docs.find((x) => x.localId === localId);
    if (d) URL.revokeObjectURL(d.url);
    const rest = docs.filter((x) => x.localId !== localId);
    setDocs(rest);
    if (activeId === localId) setActiveId(rest[0]?.localId || "");
  }

  function gotoSource(s: Source) {
    const d = docs.find((x) => x.docId === s.doc_id);
    if (d) {
      setActiveId(d.localId);
      setPage(s.page);
    }
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || sending) return;
    if (ready.length === 0) {
      toast("Wait for your PDF(s) to finish processing.", "info");
      return;
    }
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setSending(true);
    try {
      const r = await api.pdfChatMulti(ready.map((d) => d.docId), q);
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

  const iframeSrc = active ? `${active.url}#page=${page || 1}&view=FitH` : "";

  /* ----------------------------- Empty state ----------------------------- */
  if (docs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Reveal>
          <header className="text-center">
            <span className="chip mx-auto bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
              <Icon.chat className="h-3.5 w-3.5" /> Reading room
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Read &amp; chat across your papers
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-ink-500">
              Upload one or several PDFs, read them side-by-side, and ask questions
              across all of them — answers cite the document and page.
            </p>
          </header>
        </Reveal>

        <Reveal delay={120}>
          <button
            onClick={() => fileInput.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
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
            <span className="text-base font-semibold">Drop PDFs here, or click to browse</span>
            <span className="text-xs text-ink-400">
              Up to {MAX_DOCS} files · {MAX_MB} MB each · private to your session
            </span>
          </button>
        </Reveal>

        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  /* --------------------------- Reading room --------------------------- */
  return (
    <div className="space-y-3">
      {/* PDF tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {docs.map((d) => (
          <span
            key={d.localId}
            className={`group inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition ${
              d.localId === active?.localId
                ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-ink-200 bg-white/70 text-ink-600 hover:border-brand-200 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-300"
            }`}
          >
            <button
              onClick={() => {
                setActiveId(d.localId);
                setPage(null);
              }}
              className="flex max-w-[180px] items-center gap-1.5 truncate"
              title={d.meta?.title || d.name}
            >
              {d.status === "uploading" ? (
                <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
              ) : d.status === "error" ? (
                <Icon.close className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              ) : (
                <Icon.paper className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{d.meta?.title || d.name}</span>
            </button>
            <button
              onClick={() => removeDoc(d.localId)}
              aria-label="Remove PDF"
              className="text-ink-300 transition hover:text-rose-500"
            >
              <Icon.close className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {docs.length < MAX_DOCS && (
          <button onClick={() => fileInput.current?.click()} className="btn-ghost !py-1.5 !text-sm">
            <Icon.download className="h-4 w-4 rotate-180" /> Add PDF
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Reader */}
        <section className="lg:col-span-3">
          <div className="card overflow-hidden p-0">
            {active ? (
              <iframe key={iframeSrc} src={iframeSrc} title="PDF reader" className="h-[78vh] w-full" />
            ) : (
              <div className="grid h-[78vh] place-items-center text-sm text-ink-400">
                Select a PDF above
              </div>
            )}
          </div>
        </section>

        {/* Chat across all PDFs */}
        <section className="flex h-[calc(78vh+0.5rem)] flex-col lg:col-span-2">
          <div className="card flex min-h-0 flex-1 flex-col p-0">
            <div className="flex items-center gap-2 border-b border-ink-100 p-4 dark:border-ink-800">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white">
                <Icon.sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold leading-tight">
                  Ask across {ready.length || "your"} {ready.length === 1 ? "paper" : "papers"}
                </h2>
                <p className="text-[11px] text-ink-400">Answers cite the document &amp; page</p>
              </div>
            </div>

            <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-ink-400">Try asking…</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      disabled={ready.length === 0}
                      className="block w-full rounded-xl border border-ink-100 px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50 dark:border-ink-800 dark:hover:bg-brand-500/10"
                    >
                      {s}
                    </button>
                  ))}
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
                    {m.role === "assistant" ? (
                      <Markdown text={m.text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink-200/60 pt-2 dark:border-ink-700/60">
                        {m.sources.map((s) => (
                          <button
                            key={s.n}
                            onClick={() => gotoSource(s)}
                            title={`${s.doc_title} — p.${s.page}\n${s.snippet}`}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 dark:bg-ink-800 dark:text-brand-300"
                          >
                            <Icon.paper className="h-3 w-3" />
                            {s.doc_title.slice(0, 16)}
                            {s.doc_title.length > 16 ? "…" : ""} p.{s.page}
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
                  Reading the documents…
                </div>
              )}
            </div>

            {/* Active doc references */}
            {active?.meta && active.meta.references.length > 0 && (
              <div className="border-t border-ink-100 dark:border-ink-800">
                <button
                  onClick={() => setShowRefs((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-ink-500 transition hover:text-brand-600"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon.review className="h-3.5 w-3.5" /> {active.meta.references.length} refs ·{" "}
                    {(active.meta.title || active.name).slice(0, 24)}
                  </span>
                  <span>{showRefs ? "Hide" : "Show"}</span>
                </button>
                {showRefs && (
                  <ol className="max-h-40 list-decimal space-y-1.5 overflow-y-auto px-7 pb-3 text-[11px] leading-relaxed text-ink-500">
                    {active.meta.references.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

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
                  placeholder={ready.length ? "Ask across your PDFs…" : "Processing…"}
                  disabled={sending}
                  className="input max-h-28 flex-1 resize-none"
                />
                <button
                  onClick={() => ask(input)}
                  disabled={sending || !input.trim()}
                  className="btn-primary shrink-0 !px-3"
                  aria-label="Send"
                >
                  <Icon.arrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
