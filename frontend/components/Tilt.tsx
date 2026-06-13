"use client";

import { useRef, type ReactNode } from "react";

/**
 * Subtle 3D tilt that follows the cursor — for showcase cards only, not dense
 * content lists. Default max angle is intentionally small (premium, readable).
 * Reduced-motion is respected (CSS neutralizes the transform).
 */
export function Tilt({
  children,
  className = "",
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | undefined>(undefined);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(
        2
      )}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-2px)`;
    });
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className={`tilt-3d ${className}`}>
      {children}
    </div>
  );
}
