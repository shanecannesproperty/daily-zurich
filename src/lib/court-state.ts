// Court content is STATE-scoped, not city-scoped. A city shows judgments from
// its own state's courts PLUS the federal courts (Federal Court, High Court).
// This module is a pure, side-effect-free lookup so it can be unit tested and
// imported from both server functions and client components.
//
// The values returned here match the lowercase codes used by the
// public.court_feed.state column ('act','nsw','vic','qld','wa','sa','tas','nt'),
// which differ from the uppercase cities.state values ('ACT','NSW', ...).

// The lowercase state codes that appear in court_feed.state. 'federal' and
// 'high' are national tiers (Federal Court / Federal Circuit and Family Court,
// and the High Court of Australia) and are shown to every city.
export type CourtState =
  | "federal"
  | "high"
  | "nsw"
  | "vic"
  | "qld"
  | "wa"
  | "sa"
  | "tas"
  | "act"
  | "nt";

// The national court tiers every city sees alongside its own state.
export const FEDERAL_COURT_STATES: readonly CourtState[] = ["federal", "high"] as const;

// City slug -> its state code (matching court_feed.state). Keyed by the city
// slugs used across the network so any frontend can resolve its own state.
const CITY_TO_COURT_STATE: Record<string, CourtState> = {
  canberra: "act",
  sydney: "nsw",
  newcastle: "nsw",
  wollongong: "nsw",
  centralcoast: "nsw",
  melbourne: "vic",
  geelong: "vic",
  ballarat: "vic",
  bendigo: "vic",
  brisbane: "qld",
  goldcoast: "qld",
  sunshinecoast: "qld",
  townsville: "qld",
  toowoomba: "qld",
  cairns: "qld",
  perth: "wa",
  adelaide: "sa",
  tasmania: "tas",
  darwin: "nt",
};

// Resolve a city slug to its court state code. Returns null when the slug is
// not a known city so callers can fail safe (show only federal judgments)
// rather than throwing.
export function cityToCourtState(citySlug: string): CourtState | null {
  return CITY_TO_COURT_STATE[citySlug] ?? null;
}

// The full set of court_feed.state codes a given city should query: its own
// state (when known) plus the national federal tiers. Deduplicated and stable.
export function courtStatesForCity(citySlug: string): CourtState[] {
  const own = cityToCourtState(citySlug);
  const states: CourtState[] = [...FEDERAL_COURT_STATES];
  if (own && !states.includes(own)) states.push(own);
  return states;
}

// A link to a court's OFFICIAL "recent decisions" record. We surface these so
// every city points readers at the full official source for its own courts,
// even where we do not ingest individual judgments (some states publish no
// server-fetchable feed, so the link-out is all we can offer there).
export interface OfficialCourtLink {
  court: string;
  url: string;
}

// National courts shown to every city.
const NATIONAL_COURT_LINKS: readonly OfficialCourtLink[] = [
  {
    court: "High Court of Australia",
    url: "https://www.hcourt.gov.au/announcements/recent-judgments",
  },
  { court: "Federal Court of Australia", url: "https://www.judgments.fedcourt.gov.au/" },
  {
    court: "Federal Circuit and Family Court of Australia",
    url: "https://www.fcfcoa.gov.au/judgments",
  },
];

// Each state's official recent-judgments page (the court's own site).
const STATE_COURT_LINKS: Record<CourtState, readonly OfficialCourtLink[]> = {
  federal: [],
  high: [],
  act: [{ court: "ACT Courts", url: "https://www.courts.act.gov.au/" }],
  nsw: [{ court: "NSW Caselaw", url: "https://www.caselaw.nsw.gov.au/" }],
  vic: [
    {
      court: "Supreme Court of Victoria",
      url: "https://www.supremecourt.vic.gov.au/areas/case-summaries/judgments",
    },
    {
      court: "County Court of Victoria",
      url: "https://www.countycourt.vic.gov.au/court-decisions",
    },
  ],
  qld: [
    {
      court: "Queensland Courts",
      url: "https://www.courts.qld.gov.au/going-to-court/court-resources/court-decisions-findings-and-judgments",
    },
    {
      court: "Queensland Judgments",
      url: "https://www.queenslandjudgments.com.au/caselaw/recent-judgments",
    },
  ],
  wa: [
    {
      court: "Supreme Court of Western Australia",
      url: "https://www.supremecourt.wa.gov.au/J/judgments.aspx",
    },
  ],
  sa: [
    {
      court: "Courts of South Australia",
      url: "https://www.courts.sa.gov.au/court-decisions/judgments/",
    },
  ],
  tas: [
    {
      court: "Supreme Court of Tasmania",
      url: "https://www.supremecourt.tas.gov.au/the-court/publications/latest-sentences/",
    },
  ],
  nt: [
    {
      court: "Supreme Court of the Northern Territory",
      url: "https://supremecourt.nt.gov.au/decisions",
    },
  ],
};

// The official court records a given city should link out to: its own state's
// court(s) first (most relevant to a local reader), then the national courts.
// Returns only the national tiers when the slug is unknown, so it fails safe.
export function officialCourtLinksForCity(citySlug: string): OfficialCourtLink[] {
  const own = cityToCourtState(citySlug);
  const ownLinks = own ? (STATE_COURT_LINKS[own] ?? []) : [];
  return [...ownLinks, ...NATIONAL_COURT_LINKS];
}
