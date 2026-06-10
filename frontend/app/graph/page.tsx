"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GraphLink, GraphNode } from "@/lib/types";
import { CitationGraph } from "@/components/CitationGraph";
import { EmptyState, Icon } from "@/components/ui";

export default function GraphPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) { setQ(initial); run(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    try {
      setData(await api.graph(query));
    } finally {
      setLoading(false);
    }
  }

  const paperCount = data?.nodes.filter((n) => n.type === "paper").length || 0;
  const authorCount = data?.nodes.filter((n) => n.type === "author").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
            🕸
          </span>
          Citation network
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Visualize how papers and authors connect for any research topic.
        </p>
      </div>

      <div className="card flex gap-2 p-4">
        <div className="relative flex-1">
          <Icon.search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-11"
            placeholder="e.g. indoor wifi localization"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(q)}
          />
        </div>
        <button className="btn-primary" onClick={() => run(q)} disabled={loading}>
          {loading ? "Building…" : "Visualize"}
        </button>
      </div>

      {loading && (
        <div className="card flex items-center justify-center gap-3 p-16 text-ink-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          Mapping the citation network…
        </div>
      )}

      {data && !loading && (
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {paperCount} papers
            </span>
            <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              {authorCount} authors
            </span>
            <span className="chip-muted">{data.links.length} connections</span>
          </div>
          {data.nodes.length > 0 ? (
            <CitationGraph nodes={data.nodes} links={data.links} />
          ) : (
            <EmptyState title="No network found" hint="Try a broader topic." />
          )}
        </div>
      )}

      {!data && !loading && (
        <EmptyState
          icon={<span>🕸</span>}
          title="Enter a topic to build its citation network"
          hint="Papers and their authors are mapped as an interactive force-directed graph."
        />
      )}
    </div>
  );
}
