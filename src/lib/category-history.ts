// Tracks which article categories the reader visits, persisted in
// localStorage. Used by /my-feed to surface articles from the reader's
// top categories. Bumped from category routes and from article pages on
// view. Pure client utility — safe to import from any component.
const KEY = "tdc_category_history";
const VERSION = 1;

type State = { v: number; counts: Record<string, number> };

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { v: VERSION, counts: {} };
    const parsed = JSON.parse(raw) as State;
    if (parsed.v !== VERSION) return { v: VERSION, counts: {} };
    return parsed;
  } catch {
    return { v: VERSION, counts: {} };
  }
}

function write(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function bumpCategory(category: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!category) return;
  const state = read();
  state.counts[category] = (state.counts[category] ?? 0) + 1;
  write(state);
}

/** Return categories ranked by visit count, highest first. */
export function rankedCategories(): { category: string; count: number }[] {
  if (typeof window === "undefined") return [];
  const { counts } = read();
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function topCategories(n: number): string[] {
  return rankedCategories().slice(0, n).map((r) => r.category);
}
