/**
 * ICS (iCalendar RFC 5545) generation for single-event "Add to Calendar".
 * Ported from whatsoncanberra, adapted for the Daily Canberra event schema.
 */
import { cityName, siteDomain, siteName } from "@/lib/city";

function siteHost(): string {
  return siteDomain().replace(/^https?:\/\//, "");
}

export type IcsEvent = {
  slug: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  venue: string | null;
  suburb: string | null;
  source_url: string | null;
};

/** Fold long lines per RFC 5545 §3.1 (max 75 octets per line). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

/** Escape TEXT values per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function toIcsDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Build a full VCALENDAR string for a single event. */
export function buildEventIcs(event: IcsEvent): string {
  const dtStart = toIcsDate(event.start_at);
  if (!dtStart) return "";

  const dtEnd = toIcsDate(event.end_at) ?? dtStart;
  const loc = [event.venue, event.suburb, cityName()].filter(Boolean).join(", ");
  const url = `${siteDomain()}/event/${event.slug}`;
  const desc = event.source_url
    ? `${escapeIcsText("Details: " + event.source_url)}\\n\\n${escapeIcsText(url)}`
    : escapeIcsText(url);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteName()}//EN`,
    "BEGIN:VEVENT",
    `UID:${event.slug}@${siteHost()}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeIcsText(event.title)}`),
    foldLine(`LOCATION:${escapeIcsText(loc)}`),
    foldLine(`DESCRIPTION:${desc}`),
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Return a data: URI for a downloadable .ics file. */
export function buildIcsDataUri(event: IcsEvent): string {
  const ics = buildEventIcs(event);
  if (!ics) return "";
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** Generate a safe filename from an event title. */
export function icsFilename(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 60) + ".ics"
  );
}
