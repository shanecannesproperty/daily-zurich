// Client-side persistent log of image acquisition attempts.
// Stored in localStorage on the admin's browser. The plan forbids new
// Supabase tables, so this is the most durable store available.
export const LOG_KEY = "tdc-image-acquisition-log";
export const LOG_LIMIT = 2000;

export interface Candidate {
  kind: "og:image" | "twitter:image" | "og:image:secure_url";
  url: string;
  accepted?: boolean;
  reject_reason?: string;
}

export interface LogEntry {
  ts: string;
  id: string;
  slug: string;
  title: string;
  source_url: string | null;
  status: "updated" | "no-source" | "no-og" | "rejected" | "duplicate" | "fetch-error" | "skipped";
  detail?: string;
  image_url?: string;
  candidates: Candidate[];
}

export function readLog(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendLog(entries: LogEntry[]) {
  if (typeof window === "undefined") return;
  const existing = readLog();
  const next = [...entries, ...existing].slice(0, LOG_LIMIT);
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded; trim hard
    try {
      window.localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, 200)));
    } catch {
      /* give up */
    }
  }
}

export function clearLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOG_KEY);
}

/** Most recent log entry per event id. */
export function latestByEvent(): Map<string, LogEntry> {
  const map = new Map<string, LogEntry>();
  for (const e of readLog()) {
    if (!map.has(e.id)) map.set(e.id, e);
  }
  return map;
}

export function failedEventIds(): string[] {
  const ids: string[] = [];
  for (const [id, entry] of latestByEvent()) {
    if (entry.status !== "updated") ids.push(id);
  }
  return ids;
}
