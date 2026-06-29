// Slim bottom-of-screen prompt asking the reader to enable push
// notifications after their 2nd article in a session. NOT a native dialog
// until the user clicks Enable — then Notification.requestPermission()
// fires the browser prompt. Shown at most once per week.
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { cityName } from "@/lib/city";

const SESSION_READ_KEY = "dn_session_reads";
const LAST_SHOWN_KEY = "dn_push_prompt_shown_at";
const GRANTED_KEY = "dn_push_granted";
const DISMISS_KEY = "dn_push_prompt_dismissed_at";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const SW_URL = "/push-sw.js";

/** Call from article pages to count this read against the session. */
export function bumpSessionRead() {
  if (typeof window === "undefined") return;
  try {
    const n = Number(sessionStorage.getItem(SESSION_READ_KEY) ?? "0") + 1;
    sessionStorage.setItem(SESSION_READ_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function PushNotifyPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    if (!supported) return;
    if (Notification.permission !== "default") return;

    let reads = 0;
    try {
      reads = Number(sessionStorage.getItem(SESSION_READ_KEY) ?? "0");
      if (localStorage.getItem(GRANTED_KEY)) return;
      const lastShown = Number(localStorage.getItem(LAST_SHOWN_KEY) ?? "0");
      if (lastShown && Date.now() - lastShown < SEVEN_DAYS) return;
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
      if (dismissed && Date.now() - dismissed < SEVEN_DAYS) return;
    } catch {
      return;
    }

    if (reads < 2) return;
    const t = setTimeout(() => {
      setVisible(true);
      try {
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function enable() {
    setBusy(true);
    try {
      await navigator.serviceWorker.register(SW_URL).catch(() => undefined);
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        try {
          localStorage.setItem(GRANTED_KEY, "1");
        } catch {
          /* ignore */
        }
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("You're subscribed", {
            body: "We'll alert you when there's breaking news.",
            icon: "/favicon-192.png",
            tag: "dc-welcome",
          });
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Enable breaking news notifications"
      className="fixed inset-x-0 bottom-0 z-[80] border-t-2 border-[var(--accent,#A32D2D)] bg-[var(--ink,#2d2d2d)] text-[var(--bg,#f5f3ee)] print:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 text-sm">
        <p className="flex items-center gap-2">
          <Bell size={16} aria-hidden className="text-[var(--accent,#A32D2D)]" />
          <span>Get breaking {cityName()} news instantly.</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="bg-[var(--accent,#A32D2D)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "…" : "Enable"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-[var(--bg,#f5f3ee)]/70 hover:text-[var(--bg,#f5f3ee)] px-2"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-[var(--bg,#f5f3ee)]/70 hover:text-[var(--bg,#f5f3ee)]"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
