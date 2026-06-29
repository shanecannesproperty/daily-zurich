// Airline-style language picker: a globe button top-right that opens a small
// menu of the city's native language + English. Renders nothing for
// English-language cities. Uses a controlled popover so a choice applies
// instantly across the app (header, article body, etc.).
import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useLang, LANG_META } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, native, multilingual, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!multilingual) return null;

  const options = [native, "en"];
  const current = LANG_META[lang] ?? LANG_META.en;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
        className="inline-flex items-center gap-1.5 px-2 py-1 hover:opacity-80"
      >
        <Globe size={14} aria-hidden />
        <span aria-hidden>{current.flag}</span>
        <span className="hidden sm:inline normal-case tracking-normal font-medium">
          {current.label}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[180px] border border-[var(--ink)] bg-[var(--surface,#fff)] shadow-[0_6px_24px_rgba(0,0,0,0.14)]"
        >
          {options.map((code) => {
            const meta = LANG_META[code] ?? LANG_META.en;
            const active = code === lang;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm normal-case tracking-normal hover:bg-[var(--ink)] hover:text-[var(--surface,#fff)]"
              >
                <span aria-hidden className="text-base leading-none">{meta.flag}</span>
                <span className="flex-1">{meta.label}</span>
                {active && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
