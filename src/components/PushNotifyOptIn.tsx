import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

type State =
  | { kind: "unsupported" }
  | { kind: "idle"; permission: NotificationPermission }
  | { kind: "working" }
  | { kind: "enabled" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

const SW_URL = "/push-sw.js";

export function PushNotifyOptIn() {
  const [state, setState] = useState<State>({ kind: "idle", permission: "default" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    if (!supported) {
      setState({ kind: "unsupported" });
      return;
    }
    const p = Notification.permission;
    if (p === "granted") setState({ kind: "enabled" });
    else if (p === "denied") setState({ kind: "denied" });
    else setState({ kind: "idle", permission: p });
  }, []);

  async function enable() {
    setState({ kind: "working" });
    try {
      await navigator.serviceWorker.register(SW_URL).catch(() => undefined);
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setState({ kind: "enabled" });
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("You're subscribed", {
            body: "We'll alert you when there's breaking news.",
            icon: "/favicon-192.png",
            tag: "dc-welcome",
          });
        } catch { /* ignore */ }
      } else if (perm === "denied") {
        setState({ kind: "denied" });
      } else {
        setState({ kind: "idle", permission: perm });
      }
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  }

  if (state.kind === "unsupported") return null;

  return (
    <div className="border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6">
      <p className="kicker">Alerts</p>
      <h3 className="serif text-xl sm:text-2xl mt-2">Get breaking news alerts</h3>
      <p className="meta mt-2 max-w-prose">
        Browser notifications for major local stories. No spam — only when something
        genuinely breaks.
      </p>

      <div className="mt-4">
        {state.kind === "enabled" ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-red)]">
            <Check size={16} aria-hidden /> Notifications enabled
          </span>
        ) : state.kind === "denied" ? (
          <span className="inline-flex items-center gap-2 text-sm text-[var(--ink-grey)]">
            <BellOff size={16} aria-hidden />
            Notifications are blocked in your browser settings.
          </span>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={state.kind === "working"}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--ink-red)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:opacity-90 disabled:opacity-60"
          >
            <Bell size={14} aria-hidden />
            {state.kind === "working" ? "Enabling…" : "Enable notifications"}
          </button>
        )}
        {state.kind === "error" && (
          <p className="meta mt-2 text-[var(--ink-live)]">{state.message}</p>
        )}
      </div>
    </div>
  );
}
