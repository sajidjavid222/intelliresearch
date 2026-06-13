import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How IntelliResearch collects, uses, and protects your data.",
};

const UPDATED = "13 June 2026";
const CONTACT = "sajidj@iiitd.ac.in";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="card p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-sm text-ink-400">Last updated: {UPDATED}</p>

        <div className="mt-6 [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-ink-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 dark:[&_p]:text-ink-300">
          <p>
            IntelliResearch (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an AI research assistant
            for academics. This policy explains what we collect, why, and the choices you
            have. We collect only what we need to run the service.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <b>Account information</b> — your email and name, provided when you register
              or sign in with Google. We never receive your Google password.
            </li>
            <li>
              <b>Profile details</b> — anything you choose to add (role, institution,
              research interests, bio, ORCID, links). These power grant and collaborator
              matching.
            </li>
            <li>
              <b>Content you create</b> — saved papers/datasets/grants, collections, notes,
              saved searches, and monitored topics.
            </li>
            <li>
              <b>Uploaded PDFs</b> — when you use Chat-with-PDF, the file is read in memory
              to extract text; the extracted text is held temporarily to answer your
              questions and is automatically discarded. We do not store the PDF file on disk.
            </li>
            <li>
              <b>Technical data</b> — standard request logs and, if enabled, error reports
              (via Sentry) to keep the service reliable.
            </li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>To provide, personalize, and improve the service.</li>
            <li>To generate AI summaries, answers, and recommendations you request.</li>
            <li>To keep your account secure and diagnose problems.</li>
          </ul>
          <p>We do not sell your personal data, and we do not use it for advertising.</p>

          <h2>AI processing and third parties</h2>
          <p>
            To deliver core features we share the minimum necessary data with trusted
            providers:
          </p>
          <ul>
            <li>
              <b>Google (Gemini AI)</b> — your questions and the relevant text (e.g. paper
              abstracts or excerpts from a PDF you uploaded) are sent to Google&rsquo;s
              Gemini API to generate answers and summaries.
            </li>
            <li>
              <b>Google Sign-In</b> — used to authenticate you if you choose Google login.
            </li>
            <li>
              <b>Academic data sources</b> — search queries are sent to public APIs such as
              arXiv, OpenAlex, Semantic Scholar, Crossref, PubMed, and others to fetch
              results.
            </li>
            <li>
              <b>Hosting &amp; monitoring</b> — our infrastructure provider (Render) and, if
              enabled, error monitoring (Sentry).
            </li>
          </ul>

          <h2>Cookies and local storage</h2>
          <p>
            We use your browser&rsquo;s local storage to keep you signed in (an
            authentication token) and to remember preferences such as theme. We do not use
            advertising or cross-site tracking cookies.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep your account data until you delete it. Uploaded-PDF text is transient
            and discarded automatically. Cached search results from third-party sources
            expire within minutes.
          </p>

          <h2>Your rights</h2>
          <p>
            You can access, export, or permanently delete your data at any time from your{" "}
            <Link href="/dashboard">dashboard</Link> (&ldquo;Account &amp; data&rdquo;).
            Deleting your account removes your profile, saved library, notes, and monitored
            topics. You may also contact us to exercise any rights under applicable laws
            (such as the GDPR).
          </p>

          <h2>Security</h2>
          <p>
            Passwords are stored hashed (bcrypt), traffic is encrypted in transit, and
            access to data is limited to running the service. No system is perfectly
            secure, but we take reasonable measures to protect your information.
          </p>

          <h2>Children</h2>
          <p>
            IntelliResearch is intended for researchers and is not directed at children
            under 16.
          </p>

          <h2>Changes</h2>
          <p>
            We may update this policy; material changes will be reflected by the &ldquo;last
            updated&rdquo; date above.
          </p>

          <h2>Contact</h2>
          <p>
            Questions or requests? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-ink-400">
        See also our <Link href="/terms" className="font-medium text-brand-600 underline">Terms of Service</Link>.
      </p>
    </div>
  );
}
