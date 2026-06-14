"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";

const TABS = [
  { href: "/", label: "Search", icon: Icon.search },
  { href: "/read", label: "Reader", icon: Icon.fileText },
  { href: "/graph", label: "Graph", icon: Icon.network },
  { href: "/author", label: "Authors", icon: Icon.people },
  { href: "/dashboard", label: "You", icon: Icon.star },
];

/** A native-feeling bottom tab bar on phones (hidden ≥ sm). */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/60 bg-white/85 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/80 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const I = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-brand-600 dark:text-brand-400" : "text-ink-400"
              }`}
            >
              <span
                className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                  active ? "bg-brand-50 dark:bg-brand-500/15" : ""
                }`}
              >
                <I className="h-5 w-5" />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
