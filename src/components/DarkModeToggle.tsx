import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "dc:theme";

function currentTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function DarkModeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch { /* ignore */ }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="inline-flex items-center justify-center rounded-sm border border-transparent hover:border-[var(--hairline)] p-1.5 text-[var(--ink-grey)] hover:text-[var(--ink)]"
    >
      {theme === "dark" ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
    </button>
  );
}
