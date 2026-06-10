"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphLink, GraphNode } from "@/lib/types";

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  deg: number;
}

const W = 820;
const H = 560;

export function CitationGraph({
  nodes,
  links,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
}) {
  const [sim, setSim] = useState<SimNode[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 }); // pan + zoom
  const dragNode = useRef<string | null>(null);
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const raf = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const l of links) {
      d.set(l.source, (d.get(l.source) || 0) + 1);
      d.set(l.target, (d.get(l.target) || 0) + 1);
    }
    return d;
  }, [links]);

  // Neighbor lookup for hover-highlighting.
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of links) {
      if (!m.has(l.source)) m.set(l.source, new Set());
      if (!m.has(l.target)) m.set(l.target, new Set());
      m.get(l.source)!.add(l.target);
      m.get(l.target)!.add(l.source);
    }
    return m;
  }, [links]);

  useEffect(() => {
    const init: SimNode[] = nodes.map((n, i) => {
      const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const deg = degree.get(n.id) || 1;
      const base = n.type === "paper" ? 9 : 5;
      return {
        ...n,
        x: W / 2 + Math.cos(a) * 200 + (Math.random() - 0.5) * 40,
        y: H / 2 + Math.sin(a) * 160 + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0, deg,
        r: Math.min(base + deg * 1.4 + (n.citations ? Math.log1p(n.citations) : 0), 26),
      };
    });
    nodesRef.current = init;
    setSim(init);
    setView({ x: 0, y: 0, k: 1 });
  }, [nodes, degree]);

  useEffect(() => {
    if (!nodesRef.current.length) return;
    const idx = new Map(nodesRef.current.map((n, i) => [n.id, i]));
    let ticks = 0;

    function step() {
      const ns = nodesRef.current;
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy || 0.01;
          const force = 3000 / dist2;
          const dist = Math.sqrt(dist2);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
      }
      for (const l of links) {
        const a = ns[idx.get(l.source)!], b = ns[idx.get(l.target)!];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const k = 0.013 * (dist - 95);
        const fx = (dx / dist) * k, fy = (dy / dist) * k;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      for (const n of ns) {
        if (dragNode.current === n.id) { n.vx = 0; n.vy = 0; continue; }
        n.vx += (W / 2 - n.x) * 0.0022;
        n.vy += (H / 2 - n.y) * 0.0022;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
      }
      setSim([...ns]);
      ticks++;
      if (ticks < 450 || dragNode.current) raf.current = requestAnimationFrame(step);
    }
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [links, sim.length === 0]); // eslint-disable-line

  const pos = useMemo(() => new Map(sim.map((n) => [n.id, n])), [sim]);

  // Convert a mouse event to graph coordinates accounting for pan/zoom.
  function toGraph(e: React.MouseEvent, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const sy = ((e.clientY - rect.top) / rect.height) * H;
    return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k };
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragNode.current) {
      const p = toGraph(e, e.currentTarget);
      const n = nodesRef.current.find((m) => m.id === dragNode.current);
      if (n) { n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; setSim([...nodesRef.current]); }
    } else if (panRef.current) {
      setView((v) => ({
        ...v,
        x: panRef.current!.vx + (e.clientX - panRef.current!.x),
        y: panRef.current!.vy + (e.clientY - panRef.current!.y),
      }));
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setView((v) => ({ ...v, k: Math.max(0.4, Math.min(3, v.k * factor)) }));
  }

  function endInteraction() {
    dragNode.current = null;
    panRef.current = null;
  }

  const isDim = (id: string) =>
    hover != null && hover !== id && !neighbors.get(hover)?.has(id);

  const hoverNode = hover ? pos.get(hover) : null;

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.2) }))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 bg-white text-lg shadow-soft dark:border-ink-800 dark:bg-ink-900">+</button>
        <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.4, v.k * 0.83) }))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 bg-white text-lg shadow-soft dark:border-ink-800 dark:bg-ink-900">−</button>
        <button onClick={() => setView({ x: 0, y: 0, k: 1 })}
          title="Reset view"
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 bg-white text-xs shadow-soft dark:border-ink-800 dark:bg-ink-900">⟳</button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-grab touch-none rounded-xl bg-gradient-to-br from-ink-50/60 to-brand-50/30 active:cursor-grabbing dark:from-ink-950/40 dark:to-brand-950/20"
        onMouseMove={onMove}
        onMouseUp={endInteraction}
        onMouseLeave={() => { endInteraction(); setHover(null); }}
        onWheel={onWheel}
        onMouseDown={(e) => {
          panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        }}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {/* Links */}
          {links.map((l, i) => {
            const a = pos.get(l.source), b = pos.get(l.target);
            if (!a || !b) return null;
            const lit = hover && (l.source === hover || l.target === hover);
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={lit ? "stroke-brand-400" : "stroke-ink-300/40 dark:stroke-ink-700"}
                strokeWidth={lit ? 1.6 : 0.8}
                opacity={hover && !lit ? 0.25 : 1} />
            );
          })}
          {/* Nodes */}
          {sim.map((n) => {
            const isPaper = n.type === "paper";
            const fill = isPaper ? (n.seminal ? "#f59e0b" : "#13b886") : "#8b5cf6";
            const dim = isDim(n.id);
            const showLabel = (hover === n.id) || (isPaper && n.r > 15);
            return (
              <g key={n.id}
                transform={`translate(${n.x},${n.y})`}
                opacity={dim ? 0.25 : 1}
                className="cursor-pointer transition-opacity"
                onMouseDown={(e) => { e.stopPropagation(); dragNode.current = n.id; }}
                onMouseEnter={() => setHover(n.id)}
                onClick={() => { if (n.url) window.open(n.url, "_blank"); }}>
                <circle r={n.r} fill={fill} fillOpacity={isPaper ? 0.92 : 0.78}
                  stroke="white" strokeWidth={hover === n.id ? 2.5 : 1.5} />
                <text textAnchor="middle" dy="0.32em"
                  className="pointer-events-none select-none fill-white text-[9px] font-bold">
                  {isPaper ? "📄" : "👤"}
                </text>
                {showLabel && (
                  <text textAnchor="middle" y={n.r + 11}
                    className="pointer-events-none select-none fill-ink-600 text-[8px] font-medium dark:fill-ink-300">
                    {n.label.length > 26 ? n.label.slice(0, 26) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Detail tooltip */}
      {hoverNode && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-xs rounded-xl border border-ink-200 bg-white/95 px-3 py-2 text-xs shadow-lift backdrop-blur dark:border-ink-800 dark:bg-ink-900/95">
          <p className="font-semibold leading-snug">{hoverNode.label}</p>
          {hoverNode.type === "paper" ? (
            <p className="mt-1 text-ink-400">
              {hoverNode.venue ? `${hoverNode.venue} · ` : ""}
              {hoverNode.year ? `${hoverNode.year} · ` : ""}
              {(hoverNode.citations ?? 0).toLocaleString()} citations
              {hoverNode.seminal ? " · ⭐" : ""}
            </p>
          ) : (
            <p className="mt-1 text-ink-400">{hoverNode.deg} linked papers</p>
          )}
          {hoverNode.url && <p className="mt-1 text-brand-500">Click to open ↗</p>}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand-500" /> Paper</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-500" /> Seminal</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-violet-500" /> Author</span>
        <span className="ml-auto text-ink-400">Drag · scroll to zoom · click a paper to open</span>
      </div>
    </div>
  );
}
