// Slim bottom-of-page cookie consent banner. Stores acceptance in
// localStorage under `cookies_accepted`; hides forever once accepted.
// Renders nothing on the server (avoids SSR flash) and waits a tick on the
// client to read storage before showing.
import { useEffect, useState } from "react";

const KEY = "cookies_accepted";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "true") return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] print:hidden"
    >
      <div className="container-news flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="meta text-[13px] leading-snug">
          We use cookies to improve your experience. By continuing you accept our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/privacy#cookies" className="underline">
            Cookie Policy
          </a>
          .
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(KEY, "true");
              } catch {
                /* ignore */
              }
              setVisible(false);
            }}
            className="inline-flex items-center justify-center bg-[var(--ink-red,#A32D2D)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
