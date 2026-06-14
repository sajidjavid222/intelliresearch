import type {
  GraphLink,
  GraphNode,
  PdfChatResponse,
  PdfMeta,
  SearchResponse,
  User,
} from "./types";

// Requests go to /api/* which Next rewrites to the FastAPI backend.
const BASE = "";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("rp_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export interface ApiError extends Error {
  status?: number;
  coldStart?: boolean;   // gateway error → backend likely waking up
  rateLimited?: boolean; // 429 → too many requests, back off and retry
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(opts.headers || {}),
      },
    });
  } catch (e) {
    // Network failure (server unreachable) — treat as a possible cold start.
    const err: ApiError = new Error("Network error — the server may be waking up.");
    err.coldStart = true;
    throw err;
  }
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    // 502/503/504 = backend down/booting; 429 = rate-limited (slow down).
    const cold = res.status === 502 || res.status === 503 || res.status === 504;
    const limited = res.status === 429;
    const err: ApiError = new Error(
      cold ? "Server is waking up…"
        : limited ? "Server is busy — too many requests."
        : raw.slice(0, 200) || `Request failed: ${res.status}`
    );
    err.status = res.status;
    err.coldStart = cold;
    err.rateLimited = limited;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

/**
 * Retry a request through a transient failure:
 *  - cold start (gateway 502/503/504 or network error) → backend waking up
 *  - rate limit (429) → server busy, back off a bit longer
 * `onWaking(reason)` lets the UI show an appropriate message.
 */
export async function withColdStartRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; onWaking?: (reason: "waking" | "busy") => void } = {}
): Promise<T> {
  const { attempts = 8, onWaking } = opts;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      const err = e as ApiError;
      const retry = err.coldStart || err.rateLimited;
      if (retry && i < attempts - 1) {
        onWaking?.(err.rateLimited ? "busy" : "waking");
        // Rate limits get a longer, slightly increasing backoff.
        const delay = err.rateLimited ? 7000 + i * 1500 : 5000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  return fn();
}

export const api = {
  // Search
  search: (query: string, agents?: string[], limit = 15) =>
    req<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, agents, limit }),
    }),

  proposal: (topic: string) =>
    req<any>(`/api/search/proposal?topic=${encodeURIComponent(topic)}`, {
      method: "POST",
    }),

  chat: (question: string, topic: string, papers?: any[]) =>
    req<{ answer: string; sources: any[] }>("/api/search/chat", {
      method: "POST",
      body: JSON.stringify({ question, topic, papers }),
    }),

  graph: (q: string) =>
    req<{ nodes: GraphNode[]; links: GraphLink[] }>(
      `/api/monitoring/graph?q=${encodeURIComponent(q)}`
    ),

  // Admin analytics
  adminStats: (token: string) =>
    req<any>("/api/admin/stats", { headers: { "X-Admin-Token": token } }),

  // Discovery extras
  trending: () => req<{ topic: string; tag: string; heat: number }[]>("/api/discover/trending"),
  stats: () => req<any>("/api/discover/stats"),
  recommendations: () => req<any>("/api/discover/recommendations"),
  related: (q: string, limit = 6) =>
    req<import("./types").Paper[]>(
      `/api/discover/related?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  trends: (q: string) =>
    req<{ topic: string; series: { year: number; count: number }[] }>(
      `/api/discover/trends?q=${encodeURIComponent(q)}`
    ),

  // Auth
  register: (email: string, password: string, name: string) =>
    req<{ access_token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    req<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  forgotPassword: (email: string) =>
    req<{ ok: boolean }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    req<{ access_token: string; user: User }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  googleConfig: () =>
    req<{ enabled: boolean; client_id: string | null }>("/api/auth/google/config"),
  googleLogin: (credential: string) =>
    req<{ access_token: string; user: User }>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  me: () => req<User>("/api/auth/me"),
  updateProfile: (body: Partial<User>) =>
    req<User>("/api/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  deleteAccount: () => req<{ ok: boolean }>("/api/auth/me", { method: "DELETE" }),
  exportData: () => req<Record<string, any>>("/api/dashboard/export"),
  exportCitations: (fmt: "bibtex" | "ris" | "enw", collectionId?: string) => {
    const p = new URLSearchParams({ fmt });
    if (collectionId) p.set("collection_id", collectionId);
    return fetch(`/api/dashboard/export/citations?${p.toString()}`, {
      headers: { ...authHeaders() },
    }).then((r) => r.text());
  },

  // Dashboard
  saveItem: (item_type: string, title: string, payload: any, collection_id?: string) =>
    req("/api/dashboard/items", {
      method: "POST",
      body: JSON.stringify({ item_type, title, payload, collection_id }),
    }),
  listItems: (item_type?: string, collection_id?: string) => {
    const p = new URLSearchParams();
    if (item_type) p.set("item_type", item_type);
    if (collection_id) p.set("collection_id", collection_id);
    const qs = p.toString();
    return req<any[]>(`/api/dashboard/items${qs ? `?${qs}` : ""}`);
  },
  deleteItem: (id: string) =>
    req(`/api/dashboard/items/${id}`, { method: "DELETE" }),
  moveItem: (id: string, collection_id: string | null) =>
    req(`/api/dashboard/items/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ collection_id }),
    }),
  updateNote: (id: string, notes: string) =>
    req(`/api/dashboard/items/${id}/note`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  // Translation
  languages: () =>
    req<{ code: string; name: string }[]>("/api/discover/languages"),
  translate: (text: string, target: string) =>
    req<{ translation: string; target: string }>("/api/discover/translate", {
      method: "POST",
      body: JSON.stringify({ text, target }),
    }),

  // Chat-with-PDF
  uploadPdf: async (file: File): Promise<PdfMeta> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/pdf/upload", {
      method: "POST",
      body: fd,
      headers: { ...authHeaders() }, // no Content-Type: browser sets the boundary
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      const err: ApiError = new Error(raw.slice(0, 200) || `Upload failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  },
  pdfChat: (doc_id: string, question: string) =>
    req<PdfChatResponse>("/api/pdf/chat", {
      method: "POST",
      body: JSON.stringify({ doc_id, question }),
    }),

  // Collections
  listCollections: () =>
    req<{ id: string; name: string; description: string; color: string; count: number }[]>(
      "/api/dashboard/collections"
    ),
  createCollection: (name: string, description = "", color = "brand") =>
    req<{ id: string }>("/api/dashboard/collections", {
      method: "POST",
      body: JSON.stringify({ name, description, color }),
    }),
  deleteCollection: (id: string) =>
    req(`/api/dashboard/collections/${id}`, { method: "DELETE" }),

  // Author
  author: (name: string) =>
    req<any>(`/api/discover/author?name=${encodeURIComponent(name)}`),
  authorById: (authorId: string) =>
    req<any>(`/api/discover/author?author_id=${encodeURIComponent(authorId)}`),
  authorCandidates: (name: string, limit = 6) =>
    req<{
      id: string; name: string; affiliation?: string; works_count?: number;
      cited_by_count?: number; h_index?: number; orcid?: string; topics: string[];
    }[]>(`/api/discover/author/candidates?name=${encodeURIComponent(name)}&limit=${limit}`),

  subscribe: (topic: string) =>
    req("/api/dashboard/subscriptions", {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),
  listSubscriptions: () => req<any[]>("/api/dashboard/subscriptions"),
  unsubscribe: (id: string) =>
    req(`/api/dashboard/subscriptions/${id}`, { method: "DELETE" }),

  saveSearch: (query: string, agents: string[]) =>
    req("/api/dashboard/searches", {
      method: "POST",
      body: JSON.stringify({ query, agents }),
    }),
  listSearches: () => req<any[]>("/api/dashboard/searches"),

  listAlerts: () => req<any[]>("/api/dashboard/alerts"),
  runMonitoring: () => req("/api/monitoring/run", { method: "POST" }),
  history: () => req<any[]>("/api/dashboard/history"),

  bibtex: (q: string) =>
    fetch(`/api/export/bibtex?q=${encodeURIComponent(q)}`).then((r) => r.text()),
  proposalDownloadUrl: (topic: string, fmt: "md" | "docx" | "pdf") =>
    `/api/export/proposal?topic=${encodeURIComponent(topic)}&fmt=${fmt}`,
};
