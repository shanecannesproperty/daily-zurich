// Live AFL + NRL scores strip for the homepage. Polls TheSportsDB once
// per mount; renders nothing when no fixtures resolve, so a quiet week
// doesn't leave an empty band on the front page. Cached client-side per
// session to keep the API call cheap.
import { useEffect, useState } from "react";

// TheSportsDB league IDs — verified against the free-tier API.
// AFL = 4346 (Australian Football League), NRL = 4424 (National Rugby League AU)
// Note: 4440 was mapped to the wrong sport; corrected to 4424.
const LEAGUES: { id: string; label: string; sport: string }[] = [
  { id: "4346", label: "AFL", sport: "Australian Rules Football" },
  { id: "4424", label: "NRL", sport: "Rugby League" },
];

// Whitelisted substrings for known AFL & NRL teams.
// Prevents wrong-sport events (basketball, motorsport) from showing.
const AFL_TEAM_FRAGMENTS = [
  "Adelaide", "Brisbane Lions", "Carlton", "Collingwood", "Essendon",
  "Fremantle", "Geelong", "Gold Coast", "Greater Western", "GWS",
  "Hawthorn", "Melbourne", "North Melbourne", "Port Adelaide",
  "Richmond", "St Kilda", "Sydney", "West Coast", "Western Bulldogs",
];
const NRL_TEAM_FRAGMENTS = [
  "Broncos", "Raiders", "Bulldogs", "Sharks", "Titans", "Sea Eagles",
  "Storm", "Knights", "Warriors", "Cowboys", "Eels", "Panthers",
  "Rabbitohs", "Dragons", "Roosters", "Tigers", "Dolphins",
];

function isAuTeam(name: string, label: string): boolean {
  if (!name || name.trim().length < 2) return false;
  const fragments = label === "AFL" ? AFL_TEAM_FRAGMENTS : NRL_TEAM_FRAGMENTS;
  const n = name.toLowerCase();
  return fragments.some((f) => n.includes(f.toLowerCase()));
}

interface Event {
  idEvent: string;
  strLeague?: string;
  strSport?: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus?: string | null;
  strProgress?: string | null;
  dateEvent: string;
}

function isRecent(dateIso: string) {
  if (!dateIso) return false;
  const today = new Date();
  const d = new Date(dateIso);
  const diffDays = Math.abs((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 3; // widen to 3 days so weekend rounds stay visible Mon/Tue
}

function isValidEvent(e: Event, league: { label: string; sport: string }): boolean {
  // Must have both team names
  if (!e.strHomeTeam?.trim() || !e.strAwayTeam?.trim()) return false;
  // If the API returns a strSport field, validate it matches expected sport
  if (e.strSport && !e.strSport.toLowerCase().includes(league.sport.toLowerCase())) return false;
  // Validate at least one team is a known AU club
  if (!isAuTeam(e.strHomeTeam, league.label) && !isAuTeam(e.strAwayTeam, league.label)) return false;
  return true;
}

function statusLabel(e: Event): string {
  const s = (e.strStatus ?? "").toLowerCase();
  if (s.includes("ft") || s.includes("final") || s.includes("match finished")) return "Final";
  if (e.intHomeScore != null && e.intAwayScore != null && s) return e.strStatus ?? "Live";
  if (e.intHomeScore != null && e.intAwayScore != null) return "Final";
  return "Upcoming";
}

function scoreDisplay(e: Event): string {
  if (e.intHomeScore == null || e.intAwayScore == null) return "vs";
  return `${e.intHomeScore} – ${e.intAwayScore}`;
}

export function SportsScoresWidget() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Bump cache key so stale wrong-sport data is cleared
        const cacheKey = "tdc_sports_cache_v3";
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as { ts: number; events: Event[] };
            if (Date.now() - parsed.ts < 10 * 60 * 1000) {
              if (!cancelled) setEvents(parsed.events);
              return;
            }
          }
        } catch { /* ignore */ }

        const results: Event[] = [];
        for (const league of LEAGUES) {
          try {
            const res = await fetch(
              `https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${league.id}`,
            );
            if (!res.ok) continue;
            const json = (await res.json()) as { events?: Event[] | null };
            const valid = (json.events ?? [])
              .filter((e) => isRecent(e.dateEvent) && isValidEvent(e, league))
              .slice(0, 3)
              .map((e) => ({ ...e, strLeague: league.label }));
            results.push(...valid);
          } catch { /* skip league */ }
        }

        if (cancelled) return;
        setEvents(results);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), events: results }));
        } catch { /* ignore */ }
      } catch { /* ignore */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (events.length === 0) return null;

  return (
    <section
      aria-label="Latest AFL and NRL scores"
      className="border-y border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)]"
    >
      <div className="container-news flex items-center gap-4 overflow-x-auto py-2 text-sm">
        <span className="kicker shrink-0 text-[var(--accent,#A32D2D)]">Footy scores</span>
        <ul className="flex flex-1 items-center gap-x-6">
          {events.map((e) => (
            <li
              key={e.idEvent}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap border-l border-[var(--hairline,#d6d2c9)] pl-4 first:border-l-0 first:pl-0"
            >
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink,#2d2d2d)]/60">
                {e.strLeague}
              </span>
              <span className="font-semibold">{e.strHomeTeam}</span>
              <span className="tabular-nums font-medium">{scoreDisplay(e)}</span>
              <span className="font-semibold">{e.strAwayTeam}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink,#2d2d2d)]/60">
                {statusLabel(e)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
