"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";

export function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-40 grid h-11 w-11 animate-scale-in place-items-center rounded-full border border-ink-200/70 bg-white/90 text-ink-600 shadow-lift backdrop-blur transition hover:-translate-y-0.5 hover:text-brand-600 dark:border-ink-800 dark:bg-ink-900/90 dark:text-ink-300"
    >
      <Icon.arrowUp className="h-5 w-5" />
    </button>
  );
}
