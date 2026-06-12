import type { Metadata } from "next";
import { Crimson_Pro, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { PaperDrawerProvider } from "@/components/PaperDrawer";
import { CompareProvider } from "@/components/Compare";
import { ScrollTop } from "@/components/ScrollTop";
import { ServerWaking } from "@/components/ServerWaking";
import { SentryInit } from "@/components/SentryInit";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Academic serif for display headings — the "research journal" feel.
const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "IntelliResearch — Autonomous Research Assistant",
    template: "%s · IntelliResearch",
  },
  description:
    "Multi-agent AI that discovers papers, datasets, grants, conferences, patents, code, and collaborators for academic researchers — then writes the literature review.",
  keywords: [
    "research assistant", "literature review", "academic search", "papers",
    "datasets", "grants", "citation graph", "AI research",
  ],
  authors: [{ name: "Shah Sajid Naqshbandi" }],
  openGraph: {
    title: "IntelliResearch — Autonomous Research Assistant",
    description:
      "Ten AI agents discover papers, datasets, grants, conferences, patents, code & collaborators — and synthesize a cited literature review.",
    type: "website",
    siteName: "IntelliResearch",
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelliResearch — Autonomous Research Assistant",
    description:
      "Ten AI agents that discover and synthesize academic research for you.",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#070d0c" },
  ],
};

// Applied before paint to avoid a light->dark flash.
const themeScript = `
(function(){try{
  var t=localStorage.getItem('rp_theme');
  if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark')document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${crimson.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* Ambient aurora background — slow-drifting gradient orbs behind the glass UI. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-[8%] h-[34rem] w-[34rem] animate-aurora rounded-full bg-brand-400/25 blur-3xl dark:bg-brand-500/15" />
          <div className="absolute -right-32 top-1/4 h-[30rem] w-[30rem] animate-aurora-slow rounded-full bg-accent-400/20 blur-3xl dark:bg-accent-500/15" />
          <div className="absolute -bottom-48 left-1/3 h-[36rem] w-[36rem] animate-aurora rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" style={{ animationDelay: "-12s" }} />
        </div>
        <SentryInit />
        <ToastProvider>
          <PaperDrawerProvider>
            <CompareProvider>
              <CommandPalette />
              <ScrollTop />
              <ServerWaking />
              <Nav />
              <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
                {children}
              </main>
              <footer className="mx-auto max-w-7xl px-6 py-12 text-center">
                <blockquote className="mx-auto max-w-xl text-balance font-display text-base italic text-ink-500 dark:text-ink-400">
                  “Research is to see what everybody else has seen, and to think
                  what nobody else has thought.”
                  <span className="mt-1 block text-xs not-italic text-ink-400">
                    — Albert Szent-Györgyi
                  </span>
                </blockquote>
                <div className="mx-auto my-5 h-px w-24 bg-gradient-to-r from-transparent via-ink-200 to-transparent dark:via-ink-800" />
                <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
                  Made with <span className="text-rose-500">♥</span> by{" "}
                  <span className="text-gradient font-bold">Shah Sajid Naqshbandi</span>
                </p>
                <p className="mt-2 text-xs text-ink-400">
                  IntelliResearch · Live data from arXiv, Semantic Scholar, OpenAlex,
                  Crossref, Hugging Face, GitHub, OpenML, Papers With Code & more.
                </p>
              </footer>
            </CompareProvider>
          </PaperDrawerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
