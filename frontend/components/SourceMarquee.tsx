"use client";

const SOURCES = [
  "arXiv", "Semantic Scholar", "OpenAlex", "PubMed", "Crossref",
  "DBLP", "DOAJ", "Hugging Face", "GitHub", "Papers With Code",
  "OpenML", "Google Patents", "NSF",
];

/** An auto-scrolling, edge-faded marquee of live data sources (social proof). */
export function SourceMarquee() {
  return (
    <div className="relative mt-7 overflow-hidden">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        Live data from
      </p>
      {/* edge fade mask */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white/80 to-transparent dark:from-ink-950/60" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white/80 to-transparent dark:from-ink-950/60" />
      <div className="flex w-max animate-marquee gap-3 pb-1 [animation-play-state:running] hover:[animation-play-state:paused]">
        {[...SOURCES, ...SOURCES].map((s, i) => (
          <span
            key={i}
            className="shrink-0 rounded-full border border-white/60 bg-white/50 px-4 py-1.5 text-sm font-medium text-ink-600 backdrop-blur-sm dark:border-white/10 dark:bg-ink-900/40 dark:text-ink-300"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
