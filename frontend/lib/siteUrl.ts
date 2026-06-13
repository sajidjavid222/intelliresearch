// Canonical public site URL, baked at build time via NEXT_PUBLIC_SITE_URL.
// Falls back to localhost for dev so metadata/sitemap still resolve.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");
