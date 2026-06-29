// Lightweight observable store for the admin debug overlay.
import { useEffect, useState } from "react";

export type DebugQuery = {
  table: string;
  filter: string;
  count: number;
  durationMs: number;
  ok: boolean;
  error?: string;
  at: number;
};

export type DebugState = {
  lastQuery: DebugQuery | null;
  queries: DebugQuery[];
};

let state: DebugState = { lastQuery: null, queries: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function recordQuery(q: Omit<DebugQuery, "at">) {
  const entry: DebugQuery = { ...q, at: Date.now() };
  state = {
    lastQuery: entry,
    queries: [entry, ...state.queries].slice(0, 20),
  };
  emit();
}

export function useDebugState(): DebugState {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

// Helper to time a Supabase PostgREST builder and record it.
export async function tracked<
  T extends { data: unknown; error: { message: string } | null; count?: number | null },
>(table: string, filter: string, promise: PromiseLike<T>): Promise<T> {
  const t0 = performance.now();
  const res = await promise;
  const rows = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0;
  recordQuery({
    table,
    filter,
    count: res.count ?? rows,
    durationMs: Math.round(performance.now() - t0),
    ok: !res.error,
    error: res.error?.message,
  });
  return res;
}
