import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards against regressions where a CSS custom property used by components
 * (e.g. `text-[var(--paper)]`) gets removed from src/styles.css, causing
 * invisible labels.
 */
const STYLES = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");

const REQUIRED_TOKENS: ReadonlyArray<{ name: string; mustResolveToColor?: boolean }> = [
  { name: "--paper", mustResolveToColor: true },
  { name: "--ink", mustResolveToColor: true },
  { name: "--background", mustResolveToColor: true },
  { name: "--foreground", mustResolveToColor: true },
  { name: "--hairline", mustResolveToColor: true },
];

function findDefinition(token: string): string | null {
  const re = new RegExp(`${token}\\s*:\\s*([^;]+);`);
  const m = STYLES.match(re);
  return m ? m[1].trim() : null;
}

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|oklch|oklab|var\(--)/;

describe("CSS design tokens", () => {
  for (const { name, mustResolveToColor } of REQUIRED_TOKENS) {
    it(`defines ${name} in :root`, () => {
      const value = findDefinition(name);
      expect(value, `${name} must be defined in src/styles.css`).not.toBeNull();
      if (mustResolveToColor && value) {
        expect(value, `${name} must be a color value, got "${value}"`).toMatch(COLOR_RE);
      }
    });
  }
});
