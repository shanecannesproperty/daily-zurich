// Inline "save this page" nudge for the /weather page. Weather is a high-intent,
// repeat-visit utility, so we invite readers to keep it one tap away rather than
// re-search each day. Three modes, picked at runtime:
//   - install:  Android / desktop Chrome fired `beforeinstallprompt` → real PWA install
//   - ios:      iOS Safari (no beforeinstallprompt) → Share → Add to Home Screen steps
//   - bookmark: desktop without install support → Ctrl/⌘+D hint
// Renders nothing when already installed (standalone) or once dismissed.
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cityName, siteName } from "@/lib/city";

// The non-standard install event exposed by Chromium browsers.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dc_weather_install_dismissed";
type Mode = "none" | "install" | "ios" | "bookmark";

export function WeatherInstallPrompt({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already running as an installed app — nothing to offer.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* storage disabled */
    }

    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);

    // Chromium fires this when the PWA is installable; capture it for our button.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("install");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Fallback mode when no install event is available.
    if (isIOS) {
      setMode("ios");
    } else if (!isAndroid && window.matchMedia?.("(min-width: 768px)").matches) {
      setMode("bookmark");
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setMode("none");
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed or unsupported */
    }
    dismiss();
  }

  if (mode === "none") return null;

  const isMac =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent || "");
  const kbd =
    "rounded-sm border border-[var(--hairline)] bg-[var(--bg,#f5f3ee)] px-1.5 py-0.5 text-[11px] font-semibold";

  return (
    <section
      aria-label="Save this weather page"
      className={`border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker">Check it daily</p>
          <h3 className="serif text-xl sm:text-2xl mt-1">
            Keep {cityName()} weather one tap away
          </h3>

          {mode === "install" && (
            <p className="meta mt-2 max-w-prose">
              Add {siteName()} to your home screen for an instant, app-like forecast every morning —
              no app store needed.
            </p>
          )}
          {mode === "ios" && (
            <p className="meta mt-2 max-w-prose">
              Tap the <Share size={14} className="inline -mt-0.5" aria-label="Share" /> Share button
              in Safari, then choose <strong>Add to Home Screen</strong> for a one-tap{" "}
              {cityName()} forecast.
            </p>
          )}
          {mode === "bookmark" && (
            <p className="meta mt-2 max-w-prose">
              Bookmark this page for a daily check — press <kbd className={kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>{" "}
              + <kbd className={kbd}>D</kbd>.
            </p>
          )}

          <div className="mt-4 flex items-center gap-4">
            {mode === "install" && (
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-2 rounded-sm bg-[var(--ink-red)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:opacity-90"
              >
                <Download size={14} aria-hidden /> Add to home screen
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="meta underline decoration-dotted underline-offset-2"
            >
              No thanks
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-none text-[var(--ink-grey,#6b6b6b)] hover:text-[var(--ink,#2d2d2d)]"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}
