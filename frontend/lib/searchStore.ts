// Client-side persistence for search: keeps your last result set across
// navigation (sessionStorage) and a list of recent queries (localStorage).
import type { SearchResponse } from "./types";

const LAST_KEY = "rp_last_search";
const RECENT_KEY = "rp_recent_searches";
const MAX_RECENT = 8;

interface LastSearch {
  query: string;
  response: SearchResponse;
  tab: string;
  at: number;
}

export function saveLastSearch(query: string, response: SearchResponse, tab: string) {
  try {
    sessionStorage.setItem(
      LAST_KEY,
      JSON.stringify({ query, response, tab, at: Date.now() })
    );
  } catch {
    /* quota / serialization issues are non-fatal */
  }
}

export function loadLastSearch(): LastSearch | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSearch;
    // Expire after 1 hour so stale results don't linger forever.
    if (Date.now() - parsed.at > 3_600_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastSearch() {
  try {
    sessionStorage.removeItem(LAST_KEY);
  } catch {}
}

export function addRecentSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  try {
    const list = getRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {}
}

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function removeRecentSearch(query: string) {
  try {
    const list = getRecentSearches().filter((x) => x !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}
