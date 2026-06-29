// Floating table of contents for long-form articles. Scans the article body
// for h2 + h3 elements after mount, builds a nested list, and tracks the
// active heading with IntersectionObserver. Desktop-only; hidden on small
// screens to keep the reading column clean.
import { useEffect, useState } from "react";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function ArticleTOC({ containerSelector }: { containerSelector: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const nodes = Array.from(container.querySelectorAll("h2, h3")) as HTMLHeadingElement[];
    const used = new Set<string>();
    const next: Heading[] = [];
    for (const n of nodes) {
      const text = (n.textContent ?? "").trim();
      if (!text) continue;
      let id = n.id || slugify(text);
      let suffix = 2;
      while (used.has(id)) {
        id = `${slugify(text)}-${suffix++}`;
      }
      used.add(id);
      if (!n.id) n.id = id;
      next.push({ id, text, level: n.tagName === "H2" ? 2 : 3 });
    }
    setHeadings(next);

    if (next.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [containerSelector]);

  if (headings.length < 3) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="pointer-events-auto hidden xl:block fixed right-6 top-28 z-30 max-h-[calc(100vh-9rem)] w-64 overflow-auto border-l border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)]/85 backdrop-blur-sm pl-4 pr-2 py-3 text-sm"
    >

      <p className="kicker mb-3">In this story</p>
      <ol className="space-y-1.5">
        {headings.map((h) => (
          <li
            key={h.id}
            className={h.level === 3 ? "pl-3" : ""}
          >
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? "true" : undefined}
              className={[
                "block leading-snug no-underline transition-colors",
                activeId === h.id
                  ? "text-[var(--accent,#A32D2D)] font-semibold"
                  : "text-[var(--ink,#2d2d2d)]/75 hover:text-[var(--ink,#2d2d2d)]",
              ].join(" ")}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
