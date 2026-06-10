import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <p className="text-7xl font-extrabold text-gradient">404</p>
      <h1 className="mt-3 text-xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500">
        That route drifted off the research map. Let&apos;s get you back.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        ← Back to search
      </Link>
    </div>
  );
}
