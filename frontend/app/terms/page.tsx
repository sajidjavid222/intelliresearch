import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of IntelliResearch.",
};

const UPDATED = "13 June 2026";
const CONTACT = "sajidj@iiitd.ac.in";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="card p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-1 text-sm text-ink-400">Last updated: {UPDATED}</p>

        <div className="mt-6 [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-ink-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 dark:[&_p]:text-ink-300">
          <p>
            By using IntelliResearch (the &ldquo;Service&rdquo;) you agree to these Terms. If
            you do not agree, please do not use the Service.
          </p>

          <h2>The Service</h2>
          <p>
            IntelliResearch helps researchers discover papers, datasets, grants,
            conferences, code, patents, and collaborators, and provides AI-assisted
            summaries, chat, and writing tools. Results are aggregated from third-party
            academic sources.
          </p>

          <h2>Your account</h2>
          <p>
            You are responsible for the activity under your account and for keeping your
            credentials secure. Provide accurate information and notify us of any
            unauthorized use.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Use the Service for lawful academic and research purposes.</li>
            <li>Do not abuse, overload, scrape, or attempt to disrupt the Service.</li>
            <li>Do not upload content you have no right to use, or that is unlawful.</li>
            <li>Respect the terms and licenses of the underlying data sources.</li>
          </ul>

          <h2>Your content</h2>
          <p>
            You retain all rights to the profile details, notes, and files you provide. You
            grant us a limited license to process them solely to operate the Service (for
            example, sending a PDF&rsquo;s text to the AI model to answer your question). You
            are responsible for ensuring you have the right to upload and process any file.
          </p>

          <h2>AI output and accuracy</h2>
          <p>
            AI-generated summaries, answers, and recommendations may be incomplete or
            incorrect (&ldquo;hallucinations&rdquo;). The Service is a research aid, not a
            substitute for professional judgment. Always verify important claims against the
            original sources before relying on them.
          </p>

          <h2>Third-party data and links</h2>
          <p>
            Search results, metadata, and links come from external providers. We do not
            control and are not responsible for the accuracy, availability, or content of
            those sources.
          </p>

          <h2>Intellectual property</h2>
          <p>
            The Service&rsquo;s software, design, and branding belong to us. These Terms do
            not grant you any rights to our trademarks or to the content of third-party
            sources.
          </p>

          <h2>No warranty</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
            without warranties of any kind, including fitness for a particular purpose or
            uninterrupted availability.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect,
            incidental, or consequential damages, or for any loss of data or research
            outcomes arising from your use of the Service.
          </p>

          <h2>Termination</h2>
          <p>
            You may stop using the Service and delete your account at any time. We may
            suspend or terminate access that violates these Terms.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these Terms; continued use after changes constitutes acceptance.
            The &ldquo;last updated&rdquo; date reflects the current version.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these Terms? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-ink-400">
        See also our <Link href="/privacy" className="font-medium text-brand-600 underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
