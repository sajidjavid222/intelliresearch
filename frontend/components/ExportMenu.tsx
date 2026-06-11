"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";

export function ExportMenu({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const q = encodeURIComponent(query);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Grouped so users see this does BOTH citations AND AI-generated proposals.
  const groups = [
    {
      heading: "Citations",
      items: [
        { label: "BibTeX (.bib)", desc: "For LaTeX / Overleaf", href: `/api/export/bibtex?q=${q}`, icon: <Icon.review className="h-4 w-4" /> },
        { label: "RIS (.ris)", desc: "Zotero · Mendeley · EndNote", href: `/api/export/ris?q=${q}`, icon: <Icon.star className="h-4 w-4" /> },
      ],
    },
    {
      heading: "AI-generated proposal",
      items: [
        { label: "Proposal (PDF)", desc: "Ready-to-read research proposal", href: `/api/export/proposal?topic=${q}&fmt=pdf`, icon: <Icon.fileText className="h-4 w-4" /> },
        { label: "Proposal (Word)", desc: "Editable .docx", href: `/api/export/proposal?topic=${q}&fmt=docx`, icon: <Icon.fileText className="h-4 w-4" /> },
        { label: "Proposal (Markdown)", desc: "Plain text", href: `/api/export/proposal?topic=${q}&fmt=md`, icon: <Icon.review className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <div className="relative" ref={ref}>
      {/* Prominent, self-explanatory trigger */}
      <button
        className="btn-primary"
        onClick={() => setOpen((o) => !o)}
        title="Export citations (BibTeX/RIS) or generate an AI research proposal"
      >
        <Icon.download className="h-4 w-4" /> Export & Proposal
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 animate-scale-in overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900">
          <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-900/60">
            <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">
              Export this search
            </p>
            <p className="text-[11px] text-ink-400">
              Save citations, or let AI draft a full proposal.
            </p>
          </div>

          {groups.map((g) => (
            <div key={g.heading}>
              <p className="px-4 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                {g.heading}
              </p>
              {g.items.map((it) => (
                <a
                  key={it.label}
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-left transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-sm dark:bg-ink-800">
                    {it.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{it.label}</span>
                    <span className="block text-xs text-ink-400">{it.desc}</span>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
