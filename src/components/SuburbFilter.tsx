// Lightweight homepage suburb selector. Stores the chosen suburb in
// localStorage and surfaces a "Showing news for X · Clear" banner. The
// banner is informational — the article feed below remains the full
// editorial feed (untagged articles always show). When a real suburb tag
// exists on an article, the chosen suburb is also exposed via the
// `data-suburb-active` attribute on document.body so downstream
// components can opt-in to filtering without a refactor.
import { useEffect, useState } from "react";

const SUBURBS = [
  "Belconnen",
  "Gungahlin",
  "Woden",
  "Tuggeranong",
  "Inner North",
  "Inner South",
  "Weston Creek",
  "Molonglo",
];

const LS_KEY = "dn_suburb";

export function SuburbFilter() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v) setActive(v);
    } catch { /* localStorage unavailable in private mode */ }
  }, []);

  useEffect(() => {
    try {
      if (active) {
        localStorage.setItem(LS_KEY, active);
        document.body.dataset.suburbActive = active;
      } else {
        localStorage.removeItem(LS_KEY);
        delete document.body.dataset.suburbActive;
      }
    } catch { /* localStorage unavailable in private mode */ }
  }, [active]);

  return (
    <div className="container-news py-4 border-b border-[var(--hairline)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mr-2">Your suburb:</span>
        <button
          onClick={() => setActive(null)}
          className={`px-3 py-1 text-[11px] uppercase tracking-widest ${
            !active ? "bg-[var(--ink)] text-[var(--surface)]" : "border border-[var(--hairline)]"
          }`}
        >
          All
        </button>
        {SUBURBS.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={`px-3 py-1 text-[11px] uppercase tracking-widest ${
              active === s ? "bg-[var(--ink)] text-[var(--surface)]" : "border border-[var(--hairline)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {active && (
        <p className="meta mt-3">
          Showing news for <strong>{active}</strong> ·{" "}
          <button onClick={() => setActive(null)} className="underline">Clear</button>
        </p>
      )}
    </div>
  );
}
