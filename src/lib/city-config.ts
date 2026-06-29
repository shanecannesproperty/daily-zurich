// Multi-tenant city configuration. ISOMORPHIC (no server-only imports), so it is
// safe to use on both the server and the client. The app serves all of these
// city domains from ONE codebase + ONE Lovable deploy; the active city is
// resolved from the request hostname (server) or window.location.hostname
// (client). Canberra is the bulletproof default for localhost, previews,
// *.lovable.app and any unknown host, so the existing live site never breaks.

export const DEFAULT_CITY = "canberra" as const;

export interface CitySocial {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export interface CityBranding {
  slug: string;
  name: string;
  siteName: string;
  tagline: string;
  domain: string;
  accent: string;
  coords: [number, number];
  timezone: string;
  region: string;
  ga4Id: string;
  social?: CitySocial;
  launched: boolean;
}

export const DRAFT_CITY_SLUGS: ReadonlySet<string> = new Set<string>([
  // Cities without dedicated .news domains yet
  "dublin", "auckland", "wellington", "vancouver", "manchester",
  "capetown", "bangalore", "manila", "kualalumpur",
]);

export function isCityLaunched(slug: string): boolean {
  if (slug === DEFAULT_CITY) return true;
  return !DRAFT_CITY_SLUGS.has(slug);
}

const SLUG_TO_REGION: Record<string, string> = {
  // Australian states/territories
  canberra: "ACT", sydney: "NSW", newcastle: "NSW", wollongong: "NSW",
  centralcoast: "NSW", melbourne: "VIC", geelong: "VIC", ballarat: "VIC",
  bendigo: "VIC", brisbane: "QLD", goldcoast: "QLD", sunshinecoast: "QLD",
  townsville: "QLD", toowoomba: "QLD", cairns: "QLD", perth: "WA",
  adelaide: "SA", darwin: "NT", tasmania: "TAS",
  // International — ISO 3166-1 alpha-2
  london: "GB", manchester: "GB", dublin: "IE", auckland: "NZ",
  wellington: "NZ", vancouver: "CA", toronto: "CA", singapore: "SG",
  hongkong: "HK", capetown: "ZA", johannesburg: "ZA", nairobi: "KE",
  lagos: "NG", mumbai: "IN", bangalore: "IN", delhi: "IN", manila: "PH",
  kualalumpur: "MY", bangkok: "TH", jakarta: "ID", hochiminhcity: "VN",
  amsterdam: "NL", berlin: "DE", frankfurt: "DE", zurich: "CH",
  milan: "IT", paris: "FR", barcelona: "ES", madrid: "ES",
  newyork: "US", losangeles: "US", sanfrancisco: "US", washingtondc: "US",
  boston: "US", buenosaires: "AR", santiago: "CL", saopaulo: "BR",
  mexicocity: "MX", cairo: "EG", dubai: "AE", istanbul: "TR",
  tokyo: "JP", shanghai: "CN",
};

// BCP-47 language tags for our English-language publications.
// AU state codes (ACT/NSW/VIC/QLD/WA/SA/NT/TAS) -> en-AU.
// English co-official markets get their variant; non-English-primary markets
// use bare "en" (publication language, not region language).
const REGION_TO_BCP47: Record<string, string> = {
  ACT: "en-AU", NSW: "en-AU", VIC: "en-AU", QLD: "en-AU",
  WA:  "en-AU", SA:  "en-AU", NT:  "en-AU", TAS: "en-AU",
  GB:  "en-GB", IE:  "en-IE", NZ:  "en-NZ",
  SG:  "en-SG", HK:  "en-HK",
  US:  "en-US", CA:  "en-CA",
  IN:  "en-IN", PH:  "en-PH", MY:  "en-MY",
  ZA:  "en-ZA", NG:  "en-NG", KE:  "en-KE",
};

export function slugToBcp47(slug: string): string {
  const region = SLUG_TO_REGION[slug] ?? "AU";
  return REGION_TO_BCP47[region] ?? "en";
}

const CITY_GA4: Record<string, string> = {
  canberra: "G-GT1V5ZBWCM", sydney: "G-7NHKXC75ZB", melbourne: "G-2G3BT4P78P",
  perth: "G-3Z80958Z6E", brisbane: "G-CZ8XMMP8N5", goldcoast: "G-Z1GPQMJLG2",
  tasmania: "G-W75RC3R6W6", adelaide: "G-6WWX4QRVF4", newcastle: "G-5DV5R6X2ZG",
  wollongong: "G-M0T3N2RBTY", centralcoast: "G-3BWSPC9YCG",
  sunshinecoast: "G-KVN3DPPDMS", geelong: "G-VXS5SG54XH",
  townsville: "G-L1Y42ZDRHP", darwin: "G-Z7QER5GZKN",
  toowoomba: "G-96ZETBBYTW", ballarat: "G-6C20Z81J7B",
  bendigo: "G-RF759N5GXE", cairns: "G-M84JS9LHV5",
};

const CANBERRA_SOCIAL: CitySocial = {
  facebook: "https://www.facebook.com/thedailycanberra",
  instagram: "https://www.instagram.com/thedailycanberra",
  twitter: "https://twitter.com/dailycanberra",
};
const SYDNEY_SOCIAL: CitySocial = { facebook: "https://www.facebook.com/1240976939090398" };
const MELBOURNE_SOCIAL: CitySocial = { facebook: "https://www.facebook.com/1182091988318651" };

export const CITY_BRANDING: Record<string, CityBranding> = {
  // ── Australian cities ──────────────────────────────────────────────────────
  canberra:     brand("canberra",     "Canberra",      "#9a1f1f", [-35.2809, 149.1300], "Australia/Sydney",    undefined,                  CANBERRA_SOCIAL),
  sydney:       brand("sydney",       "Sydney",        "#0a5ad4", [-33.8688, 151.2093], "Australia/Sydney",    undefined,                  SYDNEY_SOCIAL),
  melbourne:    brand("melbourne",    "Melbourne",     "#163a5f", [-37.8136, 144.9631], "Australia/Melbourne", undefined,                  MELBOURNE_SOCIAL),
  perth:        brand("perth",        "Perth",         "#b8860b", [-31.9523, 115.8613], "Australia/Perth"),
  brisbane:     brand("brisbane",     "Brisbane",      "#7a1f5a", [-27.4705, 153.0260], "Australia/Brisbane"),
  goldcoast:    brand("goldcoast",    "Gold Coast",    "#c2762a", [-28.0167, 153.4000], "Australia/Brisbane",  "dailygoldcoast.com.au"),
  tasmania:     brand("tasmania",     "Tasmania",      "#1f6f54", [-42.8821, 147.3272], "Australia/Hobart",    "dailytasmania.com.au"),
  adelaide:     brand("adelaide",     "Adelaide",      "#a3322a", [-34.9285, 138.6007], "Australia/Adelaide"),
  newcastle:    brand("newcastle",    "Newcastle",     "#1f5a7a", [-32.9283, 151.7817], "Australia/Sydney"),
  wollongong:   brand("wollongong",   "Wollongong",    "#246b6b", [-34.4278, 150.8931], "Australia/Sydney"),
  centralcoast: brand("centralcoast", "Central Coast", "#2a7a9a", [-33.4269, 151.3417], "Australia/Sydney",    "dailycentralcoast.com.au"),
  sunshinecoast:brand("sunshinecoast","Sunshine Coast","#d68a1e", [-26.6500, 153.0667], "Australia/Brisbane",  "dailysunshinecoast.com.au"),
  geelong:      brand("geelong",      "Geelong",       "#37507a", [-38.1499, 144.3617], "Australia/Melbourne"),
  townsville:   brand("townsville",   "Townsville",    "#1f7a6a", [-19.2590, 146.8169], "Australia/Brisbane"),
  darwin:       brand("darwin",       "Darwin",        "#c46a1f", [-12.4634, 130.8456], "Australia/Darwin"),
  toowoomba:    brand("toowoomba",    "Toowoomba",     "#7a4a1f", [-27.5598, 151.9507], "Australia/Brisbane"),
  ballarat:     brand("ballarat",     "Ballarat",      "#5a3a7a", [-37.5622, 143.8503], "Australia/Melbourne"),
  bendigo:      brand("bendigo",      "Bendigo",       "#8a6a1f", [-36.7570, 144.2794], "Australia/Melbourne"),
  cairns:       brand("cairns",       "Cairns",        "#1f8a6a", [-16.9203, 145.7710], "Australia/Brisbane"),

  // ── International — Tier 1 (.news, DNS active) ────────────────────────────
  london:       brand("london",       "London",        "#1d3b73", [ 51.5074,  -0.1278], "Europe/London",       "dailylondon.news"),
  singapore:    brand("singapore",    "Singapore",     "#b3122b", [  1.3521, 103.8198], "Asia/Singapore",      "dailysingapore.news"),
  hongkong:     brand("hongkong",     "Hong Kong",     "#9c1f3a", [ 22.3193, 114.1694], "Asia/Hong_Kong",      "dailyhongkong.news"),
  newyork:      brand("newyork",      "New York",      "#13284a", [ 40.7128, -74.0060], "America/New_York",    "dailynewyork.news"),
  losangeles:   brand("losangeles",   "Los Angeles",   "#c25e1e", [ 34.0522,-118.2437], "America/Los_Angeles", "dailylosangeles.news"),
  paris:        brand("paris",        "Paris",         "#2a3b8f", [ 48.8566,   2.3522], "Europe/Paris",        "dailyparis.news"),
  barcelona:    brand("barcelona",    "Barcelona",     "#a51c30", [ 41.3851,   2.1734], "Europe/Madrid",       "dailybarcelona.news"),

  // ── International — Tier 2 (.news Porkbun, DNS verified via A records) ────
  tokyo:        brand("tokyo",        "Tokyo",         "#b5121b", [ 35.6762, 139.6503], "Asia/Tokyo",          "dailytokyo.news"),
  shanghai:     brand("shanghai",     "Shanghai",      "#c41e3a", [ 31.2304, 121.4737], "Asia/Shanghai",       "dailyshanghai.news"),
  mumbai:       brand("mumbai",       "Mumbai",        "#c2451e", [ 19.0760,  72.8777], "Asia/Kolkata",        "dailymumbai.news"),
  delhi:        brand("delhi",        "Delhi",         "#b5451c", [ 28.7041,  77.1025], "Asia/Kolkata",        "dailydelhi.news"),
  dubai:        brand("dubai",        "Dubai",         "#c8952a", [ 25.2048,  55.2708], "Asia/Dubai",          "dailydubai.news"),
  istanbul:     brand("istanbul",     "Istanbul",      "#c0392b", [ 41.0082,  28.9784], "Europe/Istanbul",     "dailyistanbul.news"),
  jakarta:      brand("jakarta",      "Jakarta",       "#c0392b", [ -6.2088, 106.8456], "Asia/Jakarta",        "dailyjakarta.news"),
  bangkok:      brand("bangkok",      "Bangkok",       "#b8612a", [ 13.7563, 100.5018], "Asia/Bangkok",        "dailybangkok.news"),
  hochiminhcity:brand("hochiminhcity","Ho Chi Minh City","#c0392b",[10.8231, 106.6297], "Asia/Ho_Chi_Minh",    "dailyhochiminhcity.news"),
  lagos:        brand("lagos",        "Lagos",         "#0f7a4a", [  6.5244,   3.3792], "Africa/Lagos",        "dailylagos.news"),
  nairobi:      brand("nairobi",      "Nairobi",       "#1f7a3d", [ -1.2864,  36.8172], "Africa/Nairobi",      "dailynairobi.news"),
  johannesburg: brand("johannesburg", "Johannesburg",  "#c08a1e", [-26.2041,  28.0473], "Africa/Johannesburg", "dailyjohannesburg.news"),
  cairo:        brand("cairo",        "Cairo",         "#c4a21e", [ 30.0444,  31.2357], "Africa/Cairo",        "dailycairo.news"),
  buenosaires:  brand("buenosaires",  "Buenos Aires",  "#4a90d9", [-34.6037, -58.3816], "America/Argentina/Buenos_Aires", "dailybuenosaires.news"),
  saopaulo:     brand("saopaulo",     "São Paulo",     "#2ecc71", [-23.5505, -46.6333], "America/Sao_Paulo",   "dailysaopaulo.news"),
  mexicocity:   brand("mexicocity",   "Mexico City",   "#27ae60", [ 19.4326, -99.1332], "America/Mexico_City", "dailymexicocity.news"),
  santiago:     brand("santiago",     "Santiago",      "#2980b9", [-33.4489, -70.6693], "America/Santiago",    "dailysantiago.news"),
  toronto:      brand("toronto",      "Toronto",       "#c0392b", [ 43.6532, -79.3832], "America/Toronto",     "dailytoronto.news"),
  sanfrancisco: brand("sanfrancisco", "San Francisco", "#2c3e50", [ 37.7749,-122.4194], "America/Los_Angeles", "dailysanfrancisco.news"),
  washingtondc: brand("washingtondc", "Washington DC", "#1a3a6c", [ 38.9072, -77.0369], "America/New_York",    "dailywashingtondc.news"),
  boston:       brand("boston",       "Boston",        "#1a3a6c", [ 42.3601, -71.0589], "America/New_York",    "dailyboston.news"),
  berlin:       brand("berlin",       "Berlin",        "#2c3e50", [ 52.5200,  13.4050], "Europe/Berlin",       "dailyberlin.news"),
  frankfurt:    brand("frankfurt",    "Frankfurt",     "#2c3e50", [ 50.1109,   8.6821], "Europe/Berlin",       "dailyfrankfurt.news"),
  amsterdam:    brand("amsterdam",    "Amsterdam",     "#b3402a", [ 52.3676,   4.9041], "Europe/Amsterdam",    "dailyamsterdam.news"),
  zurich:       brand("zurich",       "Zurich",        "#c0392b", [ 47.3769,   8.5417], "Europe/Zurich",       "dailyzurich.news"),
  milan:        brand("milan",        "Milan",         "#2c3e50", [ 45.4654,   9.1859], "Europe/Rome",         "dailymilan.news"),
  madrid:       brand("madrid",       "Madrid",        "#c0392b", [ 40.4168,  -3.7038], "Europe/Madrid",       "dailymadrid.news"),

  // ── Other draft cities (.com domains, no Porkbun .news) ───────────────────
  dublin:       brand("dublin",       "Dublin",        "#1f7a4d", [ 53.3498,  -6.2603], "Europe/Dublin",       "dailydublin.com"),
  auckland:     brand("auckland",     "Auckland",      "#15616d", [-36.8485, 174.7633], "Pacific/Auckland",    "dailyauckland.com"),
  wellington:   brand("wellington",   "Wellington",    "#2a4d8f", [-41.2865, 174.7762], "Pacific/Auckland",    "dailywellington.com"),
  vancouver:    brand("vancouver",    "Vancouver",     "#0f6b5c", [ 49.2827,-123.1207], "America/Vancouver",   "dailyvancouver.com"),
  manchester:   brand("manchester",   "Manchester",    "#b02a2a", [ 53.4808,  -2.2426], "Europe/London",       "dailymanchester.com"),
  capetown:     brand("capetown",     "Cape Town",     "#1f8a8a", [-33.9249,  18.4241], "Africa/Johannesburg", "dailycapetown.com"),
  bangalore:    brand("bangalore",    "Bangalore",     "#7a3aa0", [ 12.9716,  77.5946], "Asia/Kolkata",        "dailybangalore.com"),
  manila:       brand("manila",       "Manila",        "#1f5aa0", [ 14.5995, 120.9842], "Asia/Manila",         "dailymanila.com"),
  kualalumpur:  brand("kualalumpur",  "Kuala Lumpur",  "#1d6f6f", [  3.1390, 101.6869], "Asia/Kuala_Lumpur",   "dailykualalumpur.com"),
};

function brand(
  slug: string,
  name: string,
  accent: string,
  coords: [number, number],
  timezone: string,
  domain?: string,
  social?: CitySocial,
): CityBranding {
  return {
    slug,
    name,
    siteName: `The Daily ${name}`,
    tagline: `${name} news, every day`,
    domain: `https://${domain ?? `daily${slug}.com.au`}`,
    accent,
    coords,
    timezone,
    region: SLUG_TO_REGION[slug] ?? "AU",
    ga4Id: CITY_GA4[slug] ?? CITY_GA4["canberra"],
    launched: isCityLaunched(slug),
    ...(social ? { social } : {}),
  };
}

const DOMAIN_TO_CITY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const b of Object.values(CITY_BRANDING)) {
    map[b.domain.replace(/^https?:\/\//, "")] = b.slug;
  }
  map["dailycanberra.online"] = "canberra";
  return map;
})();

export function resolveCityFromHost(rawHost: string | null | undefined): string {
  if (!rawHost) return DEFAULT_CITY;
  const host = rawHost
    .toLowerCase()
    .trim()
    .split(",")[0]
    .trim()
    .split(":")[0]
    .replace(/^\/\//, "")
    .replace(/^www\./, "");
  return DOMAIN_TO_CITY[host] ?? DEFAULT_CITY;
}

export function brandingFor(slug: string): CityBranding {
  return CITY_BRANDING[slug] ?? CITY_BRANDING[DEFAULT_CITY];
}
