import { useEffect, useState } from "react";
import { cityName } from "@/lib/city";
import { AskCanberraChat } from "./AskCanberraChat";

export function AskCanberraLauncher() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide on /admin and /ask routes to avoid duplication.
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    if (p.startsWith("/admin") || p === "/ask") return null;
  }
  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ask ${cityName()}`}
        className="fixed bottom-5 right-5 z-40 rounded-full px-4 py-3 shadow-lg bg-[var(--ink)] text-background hover:opacity-90 transition flex items-center gap-2 text-sm font-medium"
      >
        <span aria-hidden>✦</span> Ask {cityName()}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ask ${cityName()}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end p-0 sm:p-5"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full sm:w-[440px] h-[85dvh] sm:h-[70dvh] bg-background border border-[var(--hairline)] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--hairline)] bg-[var(--surface)]">
              <p className="kicker">Ask {cityName()}</p>
              <button
                onClick={() => setOpen(false)}
                className="btn-ghost px-2"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <AskCanberraChat embedded />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
