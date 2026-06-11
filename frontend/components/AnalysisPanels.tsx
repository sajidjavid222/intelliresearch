"use client";

import { Icon } from "@/components/ui";
import { TranslateButton } from "@/components/Translate";
import type { LiteratureReview, ResearchGapResult } from "@/lib/types";

function List({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "brand" | "rose" | "emerald" | "amber" | "purple";
}) {
  if (!items?.length) return null;
  const dot = {
    brand: "bg-brand-500",
    rose: "bg-rose-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
  }[tone];
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 dark:border-ink-800 dark:bg-ink-900/40">
      <h4 className="mb-2 text-sm font-bold text-ink-700 dark:text-ink-200">{title}</h4>
      <ul className="space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span className="leading-snug">{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewPanel({ r }: { r: LiteratureReview }) {
  return (
    <div className="card animate-fade-up space-y-5 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon.review className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold">Literature Review</h3>
          <p className="text-xs text-ink-400">AI-synthesized from the discovered papers</p>
        </div>
      </div>

      <div>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">
          {r.summary}
        </p>
        {r.summary && <TranslateButton text={r.summary} className="mt-2" />}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <List title="Common Methodologies" items={r.methodologies} tone="brand" />
        <List title="Research Gaps" items={r.research_gaps} tone="rose" />
        <List title="Strengths" items={r.strengths} tone="emerald" />
        <List title="Weaknesses" items={r.weaknesses} tone="amber" />
      </div>
      <List title="Future Directions" items={r.future_directions} tone="purple" />

      {r.comparison_table?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-bold text-ink-700 dark:text-ink-200">
            Comparative Analysis
          </h4>
          <div className="overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ink-50 text-left dark:bg-ink-900/60">
                  {Object.keys(r.comparison_table[0]).map((k) => (
                    <th key={k} className="px-3 py-2 font-semibold capitalize text-ink-600 dark:text-ink-300">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.comparison_table.map((row, i) => (
                  <tr key={i} className="border-t border-ink-100 dark:border-ink-800">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-ink-600 dark:text-ink-300">
                        {String(v ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function GapsPanel({ g }: { g: ResearchGapResult }) {
  return (
    <div className="card animate-fade-up space-y-5 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <Icon.gap className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold">Research Gaps & Opportunities</h3>
          <p className="text-xs text-ink-400">Ranked by novelty × feasibility</p>
        </div>
      </div>

      <div className="grid gap-3">
        {g.opportunities.map((o, i) => {
          const pot = Number(o.publication_potential) || 0;
          return (
            <div
              key={i}
              className="group rounded-xl border border-ink-100 bg-white p-4 transition hover:border-brand-300 hover:shadow-soft dark:border-ink-800 dark:bg-ink-900/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 font-semibold text-ink-900 dark:text-ink-100">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    {i + 1}
                  </span>
                  {o.title}
                </span>
                {pot > 0 && (
                  <span className="chip shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {pot}/5 potential
                  </span>
                )}
              </div>
              {o.rationale && (
                <p className="mt-2 pl-8 text-sm text-ink-600 dark:text-ink-300">{o.rationale}</p>
              )}
            </div>
          );
        })}
      </div>

      {g.thesis_topics?.length > 0 && (
        <div className="rounded-xl border border-purple-200/60 bg-purple-50/50 p-4 dark:border-purple-500/20 dark:bg-purple-500/10">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300">
            <Icon.sparkles className="h-4 w-4" /> Candidate Thesis Topics
          </h4>
          <ul className="space-y-1.5 text-sm text-ink-700 dark:text-ink-200">
            {g.thesis_topics.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
