import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

// Patterns React uses for hydration mismatch warnings/errors across v18/v19.
const HYDRATION_PATTERNS = [
  /hydrat/i,
  /did not match/i,
  /server.+html.+didn'?t match/i,
  /text content does not match/i,
  /server rendered HTML/i,
  /Minified React error #(418|419|421|422|423|425)/i,
];

function isHydrationMessage(msg: string): boolean {
  return HYDRATION_PATTERNS.some((re) => re.test(msg));
}

async function collectHydrationIssues(page: Page, path: string) {
  const issues: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (isHydrationMessage(text)) issues.push(`[console.${msg.type()}] ${text}`);
  };
  const onPageError = (err: Error) => {
    const text = `${err.name}: ${err.message}\n${err.stack ?? ""}`;
    if (isHydrationMessage(text)) issues.push(`[pageerror] ${text}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  await page.goto(path, { waitUntil: "networkidle" });
  // Give React a beat to flush any post-hydration warnings.
  await page.waitForTimeout(500);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);

  return issues;
}

test("homepage hydrates without React hydration warnings", async ({ page }) => {
  const issues = await collectHydrationIssues(page, "/");
  expect(issues, `Hydration issues on /:\n${issues.join("\n")}`).toEqual([]);
});

test("/events hydrates without React hydration warnings", async ({ page }) => {
  const issues = await collectHydrationIssues(page, "/events");
  expect(issues, `Hydration issues on /events:\n${issues.join("\n")}`).toEqual([]);
});
