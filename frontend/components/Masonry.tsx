"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * True masonry: each child is placed into whichever column is currently
 * shortest, so columns stay balanced and no column trails off with a big
 * gap below it (unlike CSS multi-column, which must fill left-to-right).
 *
 * Columns are equal width (flex-1), so moving a card between columns never
 * changes its height — the greedy balance converges in one pass and re-runs
 * via ResizeObserver whenever a card's content changes (e.g. data loads).
 */
export function Masonry({
  children,
  columns = 2,
  gap = 20,
  className = "",
}: {
  children: ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  const n = items.length;
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const [cols, setCols] = useState(1);
  const [assign, setAssign] = useState<number[]>([]);

  // One column on phones/tablets, `columns` on large screens.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setCols(mq.matches ? columns : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [columns]);

  const balance = useCallback(() => {
    if (cols <= 1) {
      setAssign((prev) =>
        prev.length === n && prev.every((c) => c === 0) ? prev : new Array(n).fill(0)
      );
      return;
    }
    const heights = refs.current.slice(0, n).map((el) => el?.getBoundingClientRect().height || 0);
    const colH = new Array(cols).fill(0);
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let shortest = 0;
      for (let c = 1; c < cols; c++) if (colH[c] < colH[shortest]) shortest = c;
      next[i] = shortest;
      colH[shortest] += heights[i] + gap;
    }
    setAssign((prev) =>
      prev.length === n && prev.every((v, i) => v === next[i]) ? prev : next
    );
  }, [cols, n, gap]);

  // Rebalance after layout and whenever a card resizes.
  useEffect(() => {
    balance();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => balance());
    refs.current.slice(0, n).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [balance, n]);

  return (
    <div className={`flex flex-col lg:flex-row lg:items-start ${className}`} style={{ gap }}>
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
          {items.map((child, i) =>
            (assign[i] ?? i % cols) === c ? (
              <div key={i} ref={(el) => { refs.current[i] = el; }}>
                {child}
              </div>
            ) : null
          )}
        </div>
      ))}
    </div>
  );
}
