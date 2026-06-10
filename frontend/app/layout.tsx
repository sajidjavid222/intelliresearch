import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { PaperDrawerProvider } from "@/components/PaperDrawer";
import { CompareProvider } from "@/components/Compare";
import { ScrollTop } from "@/components/ScrollTop";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>
          <PaperDrawerProvider>
            <CompareProvider>
              <CommandPalette />
              <ScrollTop />
              <Nav />
              <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
                {children}
              </main>
              <footer className="mx-auto max-w-7xl px-6 py-12 text-center">
                <blockquote className="mx-auto max-w-xl text-balance text-sm italic text-ink-500 dark:text-ink-400">
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
