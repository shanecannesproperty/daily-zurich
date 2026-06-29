// Date formatting helpers in Australia/Canberra timezone.
const tz = "Australia/Sydney"; // ACT shares Sydney TZ
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function canberraParts(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = Number(get("day"));
  const month = Number(get("month"));
  const year = Number(get("year"));
  const weekday = WEEKDAY_SHORT.indexOf(get("weekday"));
  if (!day || !month || !year) return null;
  return { day, month, year, weekday: weekday >= 0 ? weekday : d.getDay() };
}

export function formatDate(iso: string | null | undefined) {
  try {
    const p = canberraParts(iso);
    return p ? `${p.day} ${MONTH_LONG[p.month - 1]} ${p.year}` : "";
  } catch {
    return "";
  }
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    });
  } catch {
    return "";
  }
}

export function isUpdatedDaysAfter(published: string | null, updated: string | null) {
  if (!published || !updated) return false;
  const p = new Date(published).getTime();
  const u = new Date(updated).getTime();
  return u - p > 24 * 60 * 60 * 1000;
}

// True when updated_at is meaningfully after published_at (default 30 minutes).
// Used to surface an "Updated" freshness badge on articles and cards.
export function isMeaningfullyUpdated(
  published: string | null | undefined,
  updated: string | null | undefined,
  minMinutes = 30,
) {
  if (!published || !updated) return false;
  const p = new Date(published).getTime();
  const u = new Date(updated).getTime();
  if (!Number.isFinite(p) || !Number.isFinite(u)) return false;
  return u - p > minMinutes * 60 * 1000;
}

export function isoUtc(iso: string | null | undefined) {
  if (!iso) return undefined;
  try {
    return new Date(iso).toISOString();
  } catch {
    return undefined;
  }
}

// Formats a date as "Sat 8 Mar" style in the local timezone.
export function formatShortDate(iso: string | null | undefined) {
  try {
    const p = canberraParts(iso);
    return p ? `${WEEKDAY_SHORT[p.weekday]}, ${p.day} ${MONTH_SHORT[p.month - 1]}` : "";
  } catch {
    return "";
  }
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    });
  } catch {
    return "";
  }
}

// Compact "time ago" label (e.g. "just now", "5 min ago", "3 h ago", "2 d ago").
// Falls back to a short absolute date once items are more than a week old.
// `now` is injectable so callers can keep server and client output in sync.
export function timeAgo(iso: string | null | undefined, now: number = Date.now()) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 0) return "just now";
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return formatShortDate(iso);
}

// Formats a whole-second duration as "m:ss" (e.g. 312 -> "5:12"). Empty if absent.
export function formatDuration(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return "";
  const total = Math.round(totalSeconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Heading bucket label for a date (Today, Tomorrow, This weekend, or "Sat 8 Mar").
export function dateBucketLabel(iso: string | null | undefined, now = new Date()) {
  if (!iso) return "Upcoming";
  const d = new Date(iso);
  const sameDay = (a: Date, b: Date) =>
    a.toLocaleDateString("en-AU", { timeZone: tz }) ===
    b.toLocaleDateString("en-AU", { timeZone: tz });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  if (isWeekend(d) && withinNextWeekend(d, now)) return "This weekend";
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  });
}

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Returns true if d falls on the Saturday or Sunday of the next weekend.
export function withinNextWeekend(d: Date, now = new Date()) {
  const start = new Date(now);
  // Move to upcoming Saturday 00:00 local.
  const day = start.getDay();
  const daysToSat = (6 - day + 7) % 7;
  start.setDate(start.getDate() + daysToSat);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 2); // Sat + Sun
  return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
}
