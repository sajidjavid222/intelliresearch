"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <p className="text-6xl">⚠️</p>
      <h1 className="mt-3 text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 break-words text-sm text-ink-500">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/" className="btn-ghost">
          Go home
        </a>
      </div>
    </div>
  );
}
