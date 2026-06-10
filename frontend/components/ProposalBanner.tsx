"use client";

import { Icon } from "@/components/ui";

/**
 * A highlighted call-to-action that surfaces the AI proposal generator right in
 * the results — so users discover it without opening the Export menu.
 */
export function ProposalBanner({ topic }: { topic: string }) {
  const q = encodeURIComponent(topic);
  const formats = [
    { label: "PDF", fmt: "pdf", primary: true },
    { label: "Word", fmt: "docx", primary: false },
    { label: "Markdown", fmt: "md", primary: false },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent-200/60 bg-gradient-to-br from-accent-50 via-white to-brand-50 p-5 shadow-soft dark:border-accent-500/30 dark:from-accent-950/40 dark:via-ink-900 dark:to-brand-950/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-400/20 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-brand-500 text-2xl text-white shadow-glow">
          📝
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">Draft a research proposal</h3>
            <span className="chip bg-accent-100 text-[10px] font-bold uppercase text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
              AI
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-300">
            Turn{" "}
            <span className="font-medium text-ink-700 dark:text-ink-200">“{topic}”</span>{" "}
            into a structured proposal — problem statement, objectives,
            methodology, expected outcomes & budget.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {formats.map((f) => (
            <a
              key={f.fmt}
              href={`/api/export/proposal?topic=${q}&fmt=${f.fmt}`}
              target="_blank"
              rel="noreferrer"
              className={f.primary ? "btn-primary" : "btn-ghost"}
            >
              {f.primary && <Icon.download className="h-4 w-4" />}
              {f.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
