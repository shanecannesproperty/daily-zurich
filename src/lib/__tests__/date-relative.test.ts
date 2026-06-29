// Covers the relative-time and duration helpers used by the live feed and the
// audio players. timeAgo takes an injectable `now` so output is deterministic.
import { describe, expect, it } from "vitest";
import { formatDuration, timeAgo } from "@/lib/date";

const NOW = Date.parse("2026-06-25T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const SEC = 1000;
const MIN = 60 * SEC;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe("timeAgo", () => {
  it("returns 'just now' for sub-minute and future timestamps", () => {
    expect(timeAgo(ago(10 * SEC), NOW)).toBe("just now");
    expect(timeAgo(new Date(NOW + 5 * MIN).toISOString(), NOW)).toBe("just now");
  });

  it("formats minutes, hours and days", () => {
    expect(timeAgo(ago(5 * MIN), NOW)).toBe("5 min ago");
    expect(timeAgo(ago(3 * HR), NOW)).toBe("3 h ago");
    expect(timeAgo(ago(2 * DAY), NOW)).toBe("2 d ago");
  });

  it("falls back to a short absolute date past a week", () => {
    const label = timeAgo(ago(10 * DAY), NOW);
    expect(label).not.toMatch(/ago/);
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns empty string for null or invalid input", () => {
    expect(timeAgo(null, NOW)).toBe("");
    expect(timeAgo(undefined, NOW)).toBe("");
    expect(timeAgo("not-a-date", NOW)).toBe("");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(312)).toBe("5:12");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(9)).toBe("0:09");
  });

  it("returns empty string for missing or non-positive values", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(-5)).toBe("");
  });
});
