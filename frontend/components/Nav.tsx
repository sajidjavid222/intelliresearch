"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import { clearLastSearch } from "@/lib/searchStore";
import { Icon } from "@/components/ui";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/feed", label: "For You" },
  { href: "/graph", label: "Graph" },
  { href: "/author", label: "Authors" },
  { href: "/dashboard", label: "Dashboard" },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => setTheme(getInitialTheme()), []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="btn-ghost h-9 w-9 !px-0"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

function NavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  const path = usePathname();
  const active = path === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
          : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
      }`}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    if (localStorage.getItem("rp_token")) {
      api.me().then(setUser).catch(() => localStorage.removeItem("rp_token"));
    }
  }, []);

  // Close the mobile drawer on route change.
  useEffect(() => setMenuOpen(false), [path]);

  // Lock body scroll when the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  function logout() {
    localStorage.removeItem("rp_token");
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-3 z-30 px-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/60 sm:px-5">
        <Link
          href="/"
          onClick={() => {
            // Logo = fresh homepage: drop the persisted search so results
            // don't reappear, and reset the home page if it's already mounted.
            clearLastSearch();
            window.dispatchEvent(new Event("rp:reset"));
          }}
          className="group flex items-center gap-2.5"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow">
            <span className="text-lg">✦</span>
          </span>
          <span className="text-lg font-bold tracking-tight">
            Intelli<span className="text-gradient">Research</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1.5 sm:flex">
          <div className="flex items-center gap-1">
            {LINKS.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} />
            ))}
          </div>
          <button
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              )
            }
            className="hidden items-center gap-2 rounded-lg border border-ink-200/80 bg-white/60 px-2.5 py-2 text-xs text-ink-400 transition hover:text-ink-600 dark:border-ink-800 dark:bg-ink-900/40 md:flex"
            title="Quick search (⌘K)"
          >
            <Icon.search className="h-3.5 w-3.5" />
            <kbd className="font-sans font-semibold">⌘K</kbd>
          </button>
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border border-ink-200/80 bg-white/60 py-1 pl-1 pr-3 text-sm font-medium dark:border-ink-800 dark:bg-ink-900/40"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
                  {(user.name || user.email)[0]?.toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">
                  {user.name || user.email.split("@")[0]}
                </span>
              </Link>
              <button onClick={logout} className="btn-ghost">
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: theme + hamburger */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="btn-ghost h-9 w-9 !px-0"
          >
            <span className="text-lg">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="sm:hidden">
          <div
            className="fixed inset-0 top-[72px] z-20 bg-ink-950/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute inset-x-0 z-30 animate-fade-up border-b border-ink-200/70 bg-white px-4 py-4 shadow-lift dark:border-ink-800 dark:bg-ink-950">
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <NavLink key={l.href} href={l.href} label={l.label} onClick={() => setMenuOpen(false)} />
              ))}
            </div>
            <div className="mt-3 border-t border-ink-100 pt-3 dark:border-ink-800">
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
                      {(user.name || user.email)[0]?.toUpperCase()}
                    </span>
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <button onClick={logout} className="btn-ghost">Logout</button>
                </div>
              ) : (
                <Link href="/login" className="btn-primary w-full" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
