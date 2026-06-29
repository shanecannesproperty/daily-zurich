// Hyper-local "Covering your area" widget. Requests browser geolocation,
// reverse-geocodes via Open-Meteo (no API key required), and stashes the
// result in localStorage so we don't re-prompt the user every visit.
// Renders nothing until we have a suburb to show — and silently does nothing
// if the user denies the permission or the API fails.
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

const KEY = "tdc_user_suburb";
const DENIED_KEY = "tdc_geo_denied";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Stored = { suburb: string; at: number };

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.suburb || Date.now() - parsed.at > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function InYourAreaWidget() {
  const [suburb, setSuburb] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setSuburb(stored.suburb);
    }
  }, []);

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setHidden(true);
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Open-Meteo's free reverse geocoder — no key, CORS-enabled.
          const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&count=1`;
          const res = await fetch(url);
          const json = (await res.json()) as {
            results?: Array<{ name?: string; admin2?: string; admin3?: string }>;
          };
          const hit = json.results?.[0];
          const name = hit?.admin3 ?? hit?.admin2 ?? hit?.name ?? null;
          if (name) {
            const payload: Stored = { suburb: name, at: Date.now() };
            try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch { /* ignore */ }
            setSuburb(name);
          } else {
            setHidden(true);
          }
        } catch {
          setHidden(true);
        } finally {
          setAsking(false);
        }
      },
      () => {
        try { localStorage.setItem(DENIED_KEY, String(Date.now())); } catch { /* ignore */ }
        setHidden(true);
        setAsking(false);
      },
      { timeout: 8000, maximumAge: 24 * 60 * 60 * 1000 },
    );
  }

  if (hidden) return null;

  if (suburb) {
    return (
      <div className="inline-flex items-center gap-2 border border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] px-3 py-1.5 text-xs uppercase tracking-[0.14em]">
        <MapPin size={13} aria-hidden className="text-[var(--ink-red,#A32D2D)]" />
        <span>
          Covering your area: <strong className="normal-case font-semibold">{suburb}</strong>
        </span>
      </div>
    );
  }

  // Don't auto-prompt — surface a polite button so the permission dialog
  // only appears when the reader opts in.
  // We hide the prompt if they previously denied so we don't pester.
  try {
    if (localStorage.getItem(DENIED_KEY)) return null;
  } catch { /* ignore */ }

  return (
    <button
      type="button"
      onClick={requestLocation}
      disabled={asking}
      className="inline-flex items-center gap-2 border border-dashed border-[var(--ink,#2d2d2d)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] hover:bg-[var(--surface,#e8e4dd)] disabled:opacity-60"
    >
      <MapPin size={13} aria-hidden />
      {asking ? "Finding your area…" : "Cover my area"}
    </button>
  );
}

// Helper used by the homepage to prioritise articles mentioning the
// reader's suburb. Pure client-side — re-sorts a pre-fetched list.
export function reorderForSuburb<T extends { title: string; dek?: string | null }>(
  rows: T[],
  suburb: string | null,
): T[] {
  if (!suburb || rows.length < 2) return rows;
  const needle = suburb.toLowerCase();
  const matches: T[] = [];
  const rest: T[] = [];
  for (const r of rows) {
    const hay = `${r.title} ${r.dek ?? ""}`.toLowerCase();
    if (hay.includes(needle)) matches.push(r);
    else rest.push(r);
  }
  return [...matches, ...rest];
}
