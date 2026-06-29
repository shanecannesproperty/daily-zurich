import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

// Benign noise we don't want to fail on. Keep this list tight.
const IGNORE_PATTERNS: RegExp[] = [/\[vite\]/i, /Download the React DevTools/i, /Lighthouse/i];

function isIgnored(text: string): boolean {
  return IGNORE_PATTERNS.some((re) => re.test(text));
}

async function collectConsoleErrors(page: Page, path: string) {
  const errors: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isIgnored(text)) return;
    errors.push(`[console.error] ${text}`);
  };
  const onPageError = (err: Error) => {
    const text = `${err.name}: ${err.message}`;
    if (isIgnored(text)) return;
    errors.push(`[pageerror] ${text}\n${err.stack ?? ""}`);
  };
  const onResponse = (res: import("@playwright/test").Response) => {
    const status = res.status();
    if (status >= 500) {
      errors.push(`[response ${status}] ${res.url()}`);
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  await page.goto(path, { waitUntil: "networkidle" });
  // Allow async effects, image loads, and late errors to surface.
  await page.waitForTimeout(750);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  return errors;
}

test("homepage loads without console errors", async ({ page }) => {
  const errors = await collectConsoleErrors(page, "/");
  expect(errors, `Console errors on /:\n${errors.join("\n")}`).toEqual([]);
});

test("/events loads without console errors", async ({ page }) => {
  const errors = await collectConsoleErrors(page, "/events");
  expect(errors, `Console errors on /events:\n${errors.join("\n")}`).toEqual([]);
});
