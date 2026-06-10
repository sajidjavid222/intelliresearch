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

  const items = [
    { label: "BibTeX (.bib)", desc: "LaTeX references", href: `/api/export/bibtex?q=${q}` },
    { label: "RIS (.ris)", desc: "Zotero · Mendeley · EndNote", href: `/api/export/ris?q=${q}` },
    { label: "Proposal (PDF)", desc: "AI-drafted research proposal", href: `/api/export/proposal?topic=${q}&fmt=pdf` },
    { label: "Proposal (DOCX)", desc: "Editable Word document", href: `/api/export/proposal?topic=${q}&fmt=docx` },
    { label: "Proposal (Markdown)", desc: "Plain text", href: `/api/export/proposal?topic=${q}&fmt=md` },
  ];

  return (
    <div className="relative" ref={ref}>
      <button className="btn-soft" onClick={() => setOpen((o) => !o)}>
        <Icon.download className="h-4 w-4" /> Export
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 animate-scale-in overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex flex-col gap-0.5 px-4 py-2.5 text-left transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
            >
              <span className="text-sm font-semibold">{it.label}</span>
              <span className="text-xs text-ink-400">{it.desc}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
