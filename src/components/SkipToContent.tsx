// Skip-to-main-content link — visually hidden until focused, the first
// interactive element on every page. Targets the route's <main> element via
// document.querySelector so individual route components don't need to add an
// id. Makes the link tabbable, focuses <main> on activation, and respects
// reduced-motion via CSS (no transition is used here, so nothing to gate).
export function SkipToContent() {
  function focusMain(e: React.MouseEvent | React.KeyboardEvent) {
    if (typeof document === "undefined") return;
    const main = document.querySelector("main");
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    (main as HTMLElement).focus({ preventScroll: false });
    main.scrollIntoView({ behavior: "auto", block: "start" });
  }
  return (
    <a
      href="#main-content"
      onClick={focusMain}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") focusMain(e);
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-[var(--ink,#2d2d2d)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--bg,#f5f3ee)] focus:outline focus:outline-2 focus:outline-[var(--accent,#A32D2D)] no-underline"
    >
      Skip to main content
    </a>
  );
}
