// Tests for the notice-body sanitiser. Obituary body_html originates from
// families and funeral directors, so anything executable must be stripped
// before it is rendered, while plain formatting survives.
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize-html";

describe("sanitizeHtml", () => {
  it("returns an empty string for null or empty input", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });

  it("keeps simple formatting tags a notice needs", () => {
    const out = sanitizeHtml(
      "<p>Beloved <strong>mother</strong> and <em>grandmother</em>.</p><ul><li>One</li></ul>",
    );
    expect(out).toContain("<p>");
    expect(out).toContain("<strong>mother</strong>");
    expect(out).toContain("<em>grandmother</em>");
    expect(out).toContain("<li>One</li>");
  });

  it("removes script elements and their content", () => {
    const out = sanitizeHtml("<p>Safe</p><script>alert('x')</script>");
    expect(out).toContain("Safe");
    expect(out.toLowerCase()).not.toContain("script");
    expect(out).not.toContain("alert");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeHtml('<p onclick="steal()">Text</p>');
    expect(out).toContain("Text");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("steal");
  });

  it("drops javascript: hrefs but keeps safe links", () => {
    const evil = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(evil).not.toContain("javascript");

    const safe = sanitizeHtml('<a href="https://example.com">Funeral home</a>');
    expect(safe).toContain('href="https://example.com"');
    expect(safe).toContain('rel="noopener nofollow ugc"');
    expect(safe).toContain('target="_blank"');
  });

  it("removes disallowed tags such as img and iframe", () => {
    const out = sanitizeHtml('<p>Hi</p><img src="x" onerror="hack()"><iframe src="evil"></iframe>');
    expect(out).toContain("Hi");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("hack");
  });

  it("strips inline styles", () => {
    const out = sanitizeHtml('<p style="position:fixed">Note</p>');
    expect(out).toContain("Note");
    expect(out).not.toContain("style");
  });
});
