// First-visit nudge: if a multilingual city is being shown in English but the
// visitor's browser prefers the local language, offer a one-tap switch. This
// is the "give them a choice when they enter" entry point. Dismissals and
// explicit choices are remembered so it never nags.
import { useEffect, useState } from "react";
import { useLang, LANG_META } from "@/lib/i18n";

const DISMISS_KEY = "tdc-lang-suggest-dismissed";

export function LanguageSuggestBanner() {
  const { lang, native, multilingual, setLang, t } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!multilingual || lang === native) return;
    try {
      if (localStorage.getItem("tdc-lang")) return; // user already chose
      if (localStorage.getItem(DISMISS_KEY)) return;
      const nav = (navigator.language || "").slice(0, 2).toLowerCase();
      if (nav === native) setShow(true);
    } catch {
      /* ignore */
    }
  }, [multilingual, lang, native]);

  if (!show) return null;
  const meta = LANG_META[native] ?? LANG_META.en;

  return (
    <div
      role="region"
      aria-label={t("language")}
      className="border-b border-[var(--hairline)] bg-[var(--surface,#fff)]"
    >
      <div className="container-news flex flex-wrap items-center justify-between gap-3 py-2 text-sm normal-case tracking-normal">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="text-base">{meta.flag}</span>
          {t("availableIn")}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLang(native);
              setShow(false);
            }}
            className="bg-[var(--ink-red)] text-white px-3 py-1 hover:opacity-90"
          >
            {t("switchTo")}
          </button>
          <button
            type="button"
            onClick={() => {
              try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
              setShow(false);
            }}
            className="px-2 py-1 underline hover:no-underline"
          >
            {t("dismiss")}
          </button>
        </span>
      </div>
    </div>
  );
}
