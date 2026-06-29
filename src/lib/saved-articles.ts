// localStorage-backed "save for later" bookmarks. No server state — saves are
// per-device under `saved_articles` (array of slugs). Components that mount
// the same hook share state via the `saved-articles-changed` custom event.
import { useCallback, useEffect, useState } from "react";

const KEY = "saved_articles";
const EVT = "saved-articles-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* storage disabled */
  }
}

export function useSavedArticles() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSlugs(read());
    setReady(true);
    const sync = () => setSlugs(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback((slug: string) => {
    const current = read();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    write(next);
    setSlugs(next);
  }, []);

  return { slugs, isSaved, toggle, count: slugs.length, ready };
}
