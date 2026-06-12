"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/react";

let started = false;

/**
 * Initializes Sentry on the client when NEXT_PUBLIC_SENTRY_DSN is set (baked in
 * at build time). Renders nothing; a no-op when no DSN is configured, so local
 * and preview builds are unaffected.
 */
export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn || started) return;
    started = true;
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_ENV || "production",
      tracesSampleRate: 0, // errors only — keep it lean
    });
  }, []);
  return null;
}
