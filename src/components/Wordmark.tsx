import { siteName } from "@/lib/city";

// Editorial wordmark. Uses DM Serif Display (loaded in __root.tsx) at its
// natural metrics so the glyphs are never stretched. Sized by the parent via
// font-size; the inline SVG inherits 1em so it scales with the chosen height.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={siteName()}
      className={className}
      style={{
        display: "inline-block",
        fontFamily: '"DM Serif Display", Georgia, "Times New Roman", serif',
        fontWeight: 400,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color: "var(--ink)",
        whiteSpace: "nowrap",
      }}
    >
      {siteName()}
    </span>
  );
}
