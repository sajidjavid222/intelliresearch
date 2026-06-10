"use client";

import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { usePaperDrawer } from "@/components/PaperDrawer";
import { useCompare } from "@/components/Compare";
import { Icon, ScoreBar } from "@/components/ui";
import type {
  Collaborator,
  Conference,
  Dataset,
  Grant,
  Paper,
  Patent,
  Repository,
} from "@/lib/types";

function SaveBtn({ type, title, payload }: { type: string; title: string; payload: any }) {
  const toast = useToast();
  async function save() {
    if (!localStorage.getItem("rp_token")) {
      toast("Sign in to save items to your dashboard.", "info");
      return;
    }
    try {
      await api.saveItem(type, title, payload);
      toast("Saved to your dashboard.", "success");
    } catch {
      toast("Could not save item.", "error");
    }
  }
  return (
    <button
      onClick={save}
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
    >
      <Icon.star className="h-3.5 w-3.5" /> Save
    </button>
  );
}

function CiteBtn({ p }: { p: Paper }) {
  const toast = useToast();
  function cite() {
    const authors =
      p.authors.length > 2
        ? `${p.authors[0]} et al.`
        : p.authors.join(" & ") || "Unknown";
    const text = `${authors} (${p.year || "n.d."}). ${p.title}. ${p.venue || ""}${p.doi ? ` https://doi.org/${p.doi}` : ""}`.trim();
    navigator.clipboard?.writeText(text);
    toast("Citation copied to clipboard.", "success");
  }
  return (
    <button
      onClick={cite}
      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 transition hover:text-brand-600 dark:text-ink-400"
    >
      ❝ Cite
    </button>
  );
}

function ExtLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 transition hover:text-brand-600 dark:text-ink-400"
    >
      {children}
    </a>
  );
}

// Publisher badge colors (falls back to neutral for unknown publishers).
const PUB_STYLES: Record<string, string> = {
  IEEE: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  ACM: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Nature: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Springer: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Elsevier: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  arXiv: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function PublisherBadge({ name }: { name?: string }) {
  if (!name) return null;
  const cls = PUB_STYLES[name] || "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
  return <span className={`chip font-semibold ${cls}`}>🏛 {name}</span>;
}

// "Find this paper on" deep links — Scholar/ResearchGate have no API, so we
// link out with the title pre-filled (ToS-safe, always works).
function DeepLinks({ p }: { p: Paper }) {
  const q = encodeURIComponent(p.title);
  const links = [
    { label: "Google Scholar", href: `https://scholar.google.com/scholar?q=${q}` },
    { label: "ResearchGate", href: `https://www.researchgate.net/search?q=${q}` },
    { label: "IEEE Xplore", href: `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${q}` },
    { label: "Semantic Scholar", href: `https://www.semanticscholar.org/search?q=${q}` },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
      <span className="font-medium">Find on:</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
          className="underline-offset-2 transition hover:text-brand-600 hover:underline">
          {l.label}
        </a>
      ))}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  const full = Math.round(n);
  return (
    <span className="inline-flex" title={`${n}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon.star
          key={i}
          className={`h-3.5 w-3.5 ${i < full ? "text-amber-400" : "text-ink-200 dark:text-ink-700"}`}
        />
      ))}
    </span>
  );
}

const cardCls = "card card-hover animate-fade-up p-5";

export function PaperCard({ p }: { p: Paper }) {
  const openDrawer = usePaperDrawer();
  const compare = useCompare();
  const checked = compare.isSelected(p);
  return (
    <div className={`${cardCls} ${checked ? "!border-brand-400 ring-1 ring-brand-400/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => compare.toggle(p)}
            aria-label="Select to compare"
            title="Select to compare"
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
          />
          <button
            onClick={() => openDrawer(p)}
            className="text-left text-[15px] font-semibold leading-snug text-ink-900 transition hover:text-brand-600 dark:text-ink-100"
          >
            {p.title}
          </button>
        </div>
        {p.is_seminal && (
          <span className="chip shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Icon.star className="h-3 w-3" /> Seminal
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-ink-500">
        {p.authors.slice(0, 4).map((a, i) => (
          <span key={i}>
            {i > 0 && ", "}
            <a href={`/author?name=${encodeURIComponent(a)}`}
              className="transition hover:text-brand-600 hover:underline">{a}</a>
          </span>
        ))}
        {p.authors.length > 4 ? " et al." : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <PublisherBadge name={p.publisher} />
        {p.venue && <span className="chip-muted">{p.venue}</span>}
        {p.year && <span className="chip-muted">{p.year}</span>}
        <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {(p.citation_count ?? 0).toLocaleString()} citations
        </span>
        <span className="chip-muted">{p.source}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-ink-400">relevance</span>
          <ScoreBar value={p.relevance_score * 100} />
        </div>
      </div>
      {p.abstract && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          {p.abstract}
        </p>
      )}
      <DeepLinks p={p} />
      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 dark:border-ink-800">
        <button
          onClick={() => openDrawer(p)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
        >
          <Icon.external className="h-3.5 w-3.5" /> Details
        </button>
        <ExtLink href={p.pdf_url || undefined}>
          <Icon.download className="h-3.5 w-3.5" /> PDF
        </ExtLink>
        <CiteBtn p={p} />
        <div className="ml-auto">
          <SaveBtn type="paper" title={p.title} payload={p} />
        </div>
      </div>
    </div>
  );
}

export function DatasetCard({ d }: { d: Dataset }) {
  return (
    <div className={cardCls}>
      <div className="flex items-start justify-between gap-3">
        <a href={d.url || "#"} target="_blank" rel="noreferrer"
          className="font-semibold text-ink-900 transition hover:text-brand-600 dark:text-ink-100">
          {d.name}
        </a>
        <span className="chip-muted shrink-0">{d.source}</span>
      </div>
      {d.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{d.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {d.num_samples && <span className="chip-muted">{d.num_samples} samples</span>}
        {d.modalities.map((m) => (
          <span key={m} className="chip bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">{m}</span>
        ))}
        {d.license && <span className="chip-muted">⚖ {d.license}</span>}
        {typeof d.downloads === "number" && (
          <span className="chip-muted">↓ {d.downloads.toLocaleString()}</span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 dark:border-ink-800">
        <ExtLink href={d.download_url || undefined}>
          <Icon.download className="h-3.5 w-3.5" /> Download
        </ExtLink>
        <div className="ml-auto"><SaveBtn type="dataset" title={d.name} payload={d} /></div>
      </div>
    </div>
  );
}

export function GrantCard({ g }: { g: Grant }) {
  return (
    <div className={cardCls}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink-900 dark:text-ink-100">{g.title}</h3>
        <span className="chip shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {(g.match_score * 20).toFixed(0)}% match
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">{g.agency}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-600 dark:text-ink-300">
        {g.amount && <div className="flex items-center gap-1.5"><Icon.grant className="h-3.5 w-3.5 text-ink-400" /> {g.amount}</div>}
        {g.deadline && <div className="flex items-center gap-1.5"><Icon.conf className="h-3.5 w-3.5 text-ink-400" /> {g.deadline}</div>}
        {g.eligibility && <div className="col-span-2 text-ink-500">{g.eligibility}</div>}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 dark:border-ink-800">
        <ExtLink href={g.url || undefined}><Icon.external className="h-3.5 w-3.5" /> Apply</ExtLink>
        <div className="ml-auto"><SaveBtn type="grant" title={g.title} payload={g} /></div>
      </div>
    </div>
  );
}

export function ConferenceCard({ c }: { c: Conference }) {
  return (
    <div className={cardCls}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-ink-900 dark:text-ink-100">
          {c.acronym && <span className="text-gradient">{c.acronym} · </span>}
          {c.name}
        </h3>
        {c.rank && (
          <span className="chip shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{c.rank}</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-600 dark:text-ink-300">
        {c.submission_deadline && <div>📝 Submit: <b className="font-semibold">{c.submission_deadline}</b></div>}
        {c.notification_date && <div>📬 Notify: {c.notification_date}</div>}
        {c.acceptance_rate && <div>📊 Accept: {c.acceptance_rate}</div>}
        {c.location && <div>📍 {c.location}</div>}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 dark:border-ink-800">
        <ExtLink href={c.url || undefined}><Icon.external className="h-3.5 w-3.5" /> Website</ExtLink>
        <div className="ml-auto"><SaveBtn type="conference" title={c.name} payload={c} /></div>
      </div>
    </div>
  );
}

export function RepoCard({ r }: { r: Repository }) {
  return (
    <div className={cardCls}>
      <div className="flex items-start justify-between gap-3">
        <a href={r.url} target="_blank" rel="noreferrer"
          className="font-mono text-sm font-semibold text-ink-900 transition hover:text-brand-600 dark:text-ink-100">
          {r.full_name || r.name}
        </a>
        <span className="chip-muted shrink-0">{r.source}</span>
      </div>
      {r.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{r.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-600 dark:text-ink-300">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
          <Icon.star className="h-3.5 w-3.5" /> {(r.stars ?? 0).toLocaleString()}
        </span>
        {r.framework && <span className="chip-muted">{r.framework}</span>}
        {r.language && <span className="chip-muted">{r.language}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="text-[11px] text-ink-400">reproducibility</span>
          <Stars n={r.reproducibility_score} />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-end border-t border-ink-100 pt-3 dark:border-ink-800">
        <SaveBtn type="repo" title={r.name} payload={r} />
      </div>
    </div>
  );
}

export function PatentCard({ p }: { p: Patent }) {
  return (
    <div className={cardCls}>
      <a href={p.url || "#"} target="_blank" rel="noreferrer"
        className="font-semibold leading-snug text-ink-900 transition hover:text-brand-600 dark:text-ink-100">
        {p.title}
      </a>
      <div className="mt-1.5 text-sm text-ink-500">
        {p.inventors.slice(0, 3).join(", ")}
        {p.assignee ? ` · ${p.assignee}` : ""}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {p.patent_number && <span className="chip-muted">#{p.patent_number}</span>}
        {p.year && <span className="chip-muted">{p.year}</span>}
        <span className="chip-muted">{p.source}</span>
      </div>
      {p.abstract && (
        <p className="mt-3 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{p.abstract}</p>
      )}
      <div className="mt-4 flex items-center justify-end border-t border-ink-100 pt-3 dark:border-ink-800">
        <SaveBtn type="patent" title={p.title} payload={p} />
      </div>
    </div>
  );
}

export function CollaboratorCard({ c }: { c: Collaborator }) {
  return (
    <div className={cardCls}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-sm font-bold text-white">
          {c.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <a href={`/author?name=${encodeURIComponent(c.name)}`}
              className="font-semibold text-ink-900 transition hover:text-brand-600 dark:text-ink-100">
              {c.name}
            </a>
            {c.h_index != null && (
              <span className="chip shrink-0 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                h-index {c.h_index}
              </span>
            )}
          </div>
          {c.affiliation && <p className="text-sm text-ink-500">{c.affiliation}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600 dark:text-ink-300">
        {c.paper_count != null && <span className="chip-muted">{c.paper_count.toLocaleString()} papers</span>}
        {c.citation_count != null && <span className="chip-muted">{c.citation_count.toLocaleString()} cites</span>}
        {c.interests.slice(0, 3).map((i) => (
          <span key={i} className="chip bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">{i}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end border-t border-ink-100 pt-3 dark:border-ink-800">
        <SaveBtn type="collaborator" title={c.name} payload={c} />
      </div>
    </div>
  );
}
