// Minimal hand-written types for ONLY the 8 bound tables.
// Do NOT add columns or tables that aren't in the documented schema.

export type ArticleCategory =
  | "news"
  | "federal"
  | "finance"
  | "community"
  | "sport"
  | "business"
  | "world"
  | "property"
  | "wellness"
  | "longevity";

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "news",
  "federal",
  "finance",
  "community",
  "sport",
  "business",
  "world",
  "property",
  "wellness",
  "longevity",
];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news: "News",
  federal: "Federal",
  finance: "Finance",
  community: "Community",
  sport: "Sport",
  business: "Business",
  world: "The World",
  property: "Property",
  wellness: "Wellness",
  longevity: "Longevity",
};

export type GuideCategory =
  | "food-dining"
  | "wellness"
  | "services"
  | "real-estate"
  | "tourism"
  | "things-to-do";

export type EnquiryType = "listing" | "property" | "sponsor" | "tip" | "general";

export interface CityRow {
  slug: string;
  name: string;
  domain: string | null;
  state: string | null;
  timezone: string | null;
  is_live: boolean;
  launched_at: string | null;
}

export interface ArticleRow {
  id: string;
  city: string;
  slug: string;
  title: string;
  dek: string | null;
  body_html: string | null;
  author: string | null;
  category: ArticleCategory;
  hero_image: string | null;
  // CC/public-domain attribution for the hero image. credit is the display
  // string (e.g. "Conall / CC BY 2.0"); source is a URL to the licence/source
  // page. Null for self-hosted images that need no attribution.
  hero_image_credit: string | null;
  hero_image_source: string | null;
  source_urls: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Optional narrated-article audio (added by the audio pipeline).
  audio_url: string | null;
  audio_voice: string | null;
  audio_duration_sec: number | null;
  audio_generated_at: string | null;
  // Editorial review layer (set by the screen_article trigger on every write).
  // review_status: 'auto_approved' | 'held' | 'approved' | 'rejected'.
  review_status?: string;
  risk_score?: number | null;
  risk_flags?: string[] | null;
  risk_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  canonical_url?: string | null;
}

// Daily "City in 5 minutes" listen-to-the-news briefing. One row per city per day.
export interface AudioBriefingRow {
  id: string;
  city: string;
  briefing_date: string;
  title: string | null;
  script_text: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  article_ids: string[] | null;
  created_at: string | null;
}

export type LiveFeedKind =
  | "news"
  | "weather"
  | "breaking"
  | "traffic"
  | "sport"
  | "community"
  | "video";

// Rolling "Live now" items plus the current-weather row (kind = 'weather') and
// local video items (kind = 'video', with a YouTube watch url in video_url).
export interface LiveFeedRow {
  id: string;
  city: string;
  kind: LiveFeedKind;
  title: string;
  summary: string | null;
  url: string | null;
  // YouTube watch url for kind = 'video' rows (e.g. https://www.youtube.com/watch?v=ID).
  // We embed the publisher's own player or link out; we never re-host the video.
  video_url: string | null;
  // Section for kind = 'video' rows: news | sport | business | arts | community,
  // assigned in the DB by the dn_video_category() rule. Null on non-video rows.
  video_category: string | null;
  source: string | null;
  image_url: string | null;

  temp_c: number | null;
  weather_text: string | null;
  published_at: string;
  is_published: boolean;
  created_at: string | null;
}

export interface JobRow {
  id: string;
  city: string;
  title: string;
  employer: string | null;
  location: string | null;
  category: string | null;
  salary: string | null;
  url: string;
  source: string | null;
  closes_date: string | null;
  posted_date: string | null;
  is_published: boolean;
  created_at: string | null;
}

export interface EventRow {
  id: string;
  city: string;
  slug: string;
  title: string;
  venue: string | null;
  suburb: string | null;
  start_at: string | null;
  end_at: string | null;
  price: string | null;
  category: string | null;
  source_url: string | null;
  booking_url: string | null;
  image_url: string | null;
  created_at: string;
  is_published: boolean;
}

export interface GuideRow {
  id: string;
  city: string;
  slug: string;
  title: string;
  target_keyword: string | null;
  category: GuideCategory;
  intro_html: string | null;
  seo_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  // Editorial review layer (set by the screen_guide trigger on every write).
  review_status?: string;
  risk_score?: number | null;
  risk_flags?: string[] | null;
  risk_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
}

export interface GuideEntryRow {
  id: string;
  guide_id: string;
  rank: number | null;
  business_name: string;
  blurb: string | null;
  suburb: string | null;
  source_url: string;
  website_url: string | null;
  booking_url: string | null;
  phone: string | null;
  image_url: string | null;
  is_sponsored: boolean;
  is_featured: boolean;
}

export interface ListingRow {
  id: string;
  city: string;
  business_name: string;
  category: string | null;
  suburb: string | null;
  source_url: string;
  website_url: string | null;
  booking_url: string | null;
  phone: string | null;
  image_url: string | null;
  is_sponsored: boolean;
  is_featured: boolean;
}

export interface EnquiryRow {
  id: string;
  city: string;
  enquiry_type: string | null;
  type: string | null;
  name: string | null;
  email: string;
  message: string | null;
  payload?: Record<string, unknown> | null;
  status: string | null;
  routed_to: string | null;
  created_at: string;
}

export interface SubscriberRow {
  id: string;
  city: string;
  email: string;
  source: string | null;
  status: string | null;
  created_at: string;
}

// First-party, privacy-light analytics events. No PII: only an anonymous,
// client-generated session id and an optional small label (ref).
export type SiteEventName =
  | "pageview"
  | "newsletter_signup"
  | "newsletter_confirmed"
  | "article_read"
  | "audio_play"
  | "live_feed_click";

export const SITE_EVENT_NAMES: SiteEventName[] = [
  "pageview",
  "newsletter_signup",
  "newsletter_confirmed",
  "article_read",
  "audio_play",
  "live_feed_click",
];

export interface SiteEventRow {
  id: string;
  city: string;
  event_name: SiteEventName;
  path: string | null;
  anon_session_id: string | null;
  ref: string | null;
  created_at: string;
}

// The curated daily morning briefing ("Today" edition). One row per city per
// day, written by the backend compose-edition job. `sections` is an ordered
// array of section objects (see EditionSection). The page renders only `ready`
// editions (RLS allows anon SELECT where status in ('ready','sent')). All text
// is rendered as PLAIN TEXT; there is no HTML field on an edition.

// One story inside a "top" section. `url` links out to the source; `image` is
// an optional hero. `source` credits where the story came from.
export interface EditionTopItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
}

// One diary item inside an "events" section.
export interface EditionEventItem {
  headline: string;
  venue: string | null;
  when: string | null; // ISO datetime, or null when undated
  url: string;
}

// One role inside a "jobs" section.
export interface EditionJobItem {
  headline: string;
  employer: string | null;
  url: string;
}

// A single section of the daily edition. The shape varies by `type`:
//   - "top": a list of stories (items: EditionTopItem[])
//   - "weather": a single text line (text)
//   - "events": diary items plus a "more" link (items, more_url)
//   - "jobs": job items plus a "more" link (items, more_url)
// Typed pragmatically: every optional field is present so a section of any
// kind can be read at the render site after narrowing on `type`.
export interface EditionSection {
  type: "top" | "weather" | "events" | "jobs";
  title: string;
  text?: string;
  more_url?: string;
  items?: Array<EditionTopItem | EditionEventItem | EditionJobItem>;
}

export type EditionStatus = "draft" | "ready" | "sent";

export interface DailyEditionRow {
  id: string;
  city: string;
  edition_date: string;
  subject: string | null;
  hook: string | null;
  sections: EditionSection[];
  status: EditionStatus;
  created_at: string | null;
}

// A published court judgment reference. court_feed is STATE-scoped (not
// city-scoped): see src/lib/court-state.ts. This row is LINK-OUT ONLY. We store
// and render only the court's own published metadata (case name, citation,
// catchwords) plus an outbound `url` to the OFFICIAL judgment. We never store or
// reproduce the judgment text itself. `catchwords` is the court's own summary
// text from the source and is rendered as given, not authored by us.
export interface CourtJudgmentRow {
  id: string;
  state: string;
  court: string;
  case_name: string;
  citation: string | null;
  catchwords: string | null;
  url: string;
  decision_date: string | null;
  source: string | null;
  is_published: boolean;
  created_at: string | null;
}

// A single approved, publicly-visible "Have Your Say" comment, as returned by
// the list_approved_comments(city, article_id) SECURITY DEFINER rpc. The rpc
// projects ONLY these columns — never user_id, status, author_hidden, or any
// moderation metadata. `body` and `author_name` are rendered as PLAIN TEXT in
// ArticleComments (NEVER dangerouslySetInnerHTML); there is no body_html field.
export interface CommentRow {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Property listings (REAXML-fed). The frontend reads ONLY the two PUBLIC VIEWS
// public_available_property_listings and public_recently_sold, NEVER the base
// public.property_listings table. The views already gate status/availability
// and null any not-public numeric price. The DTO types below are what the
// server functions return to the client: they carry a single pre-sanitised
// priceDisplay string and DROP the raw numeric on any not-public row, so a
// hidden price can never leak through a generic field dump.
// ---------------------------------------------------------------------------

// A row of public_available_property_listings as read from the view. The view
// nulls price_numeric/rent_numeric/bond when the matching public flag is false,
// but we still treat the raw row as sensitive and never hand it to the client.
export interface PropertyListingRow {
  id: string;
  city: string;
  agency_key: string | null;
  agency_name: string | null;
  agency_licence: string | null;
  source_unique_id: string | null;
  listing_type: string | null;
  property_type: string | null;
  category: string | null;
  status: string | null;
  under_offer: boolean | null;
  is_available: boolean | null;
  address_display: boolean | null;
  unit_number: string | null;
  lot_number: string | null;
  street_number: string | null;
  street_name: string | null;
  suburb: string | null;
  suburb_display: boolean | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  display_address: string | null;
  price_numeric: number | null;
  price_is_public: boolean | null;
  price_view_text: string | null;
  price_tax: string | null;
  rent_numeric: number | null;
  rent_is_public: boolean | null;
  rent_period: string | null;
  bond: number | null;
  date_available: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  land_area: number | null;
  building_area: number | null;
  headline: string | null;
  description: string | null;
  features: unknown;
  images: unknown;
  floorplans: unknown;
  inspection_times: unknown;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  is_featured: boolean | null;
  is_owner_stock: boolean | null;
  placement_type: string | null;
  listed_at: string | null;
  mod_time: string | null;
  slug: string;
}

// A row of public_recently_sold as read from the view.
export interface RecentlySoldRow {
  id: string;
  city: string;
  agency_key: string | null;
  agency_name: string | null;
  agency_licence: string | null;
  source_unique_id: string | null;
  listing_type: string | null;
  property_type: string | null;
  category: string | null;
  status: string | null;
  address_display: boolean | null;
  suburb: string | null;
  suburb_display: boolean | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  display_address: string | null;
  sold_price: number | null;
  sold_price_is_public: boolean | null;
  sold_price_display: string | null;
  sold_price_range: string | null;
  sold_date: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  land_area: number | null;
  building_area: number | null;
  headline: string | null;
  features: unknown;
  images: unknown;
  agent_name: string | null;
  licence: string | null;
  is_owner_stock: boolean | null;
  placement_type: string | null;
  slug: string;
}

// The CLIENT-FACING shape for an active listing. Built by the server function
// from a PropertyListingRow. There is NO raw price_numeric/rent_numeric/bond on
// this type: only the pre-sanitised priceDisplay string (and bondDisplay, shown
// only when the rent is public). priceBand is a coarse, public-safe bucket id
// (null on not-public rows) used purely for client-side filtering.
export interface PropertyListingDTO {
  id: string;
  slug: string;
  listingType: string;
  propertyType: string | null;
  category: string | null;
  underOffer: boolean;
  isFeatured: boolean;
  isOwnerStock: boolean;
  placementType: string | null;
  // Address (already composed honouring the privacy flags).
  addressLine: string;
  suburb: string | null;
  suburbDisplay: boolean;
  // Price (pre-sanitised). priceDisplay is always safe to render.
  priceDisplay: string;
  priceViewText: string | null;
  priceTax: string | null;
  priceBand: string | null;
  // Rent extras (only present/positive when rent is public).
  rentPeriod: string | null;
  bondDisplay: string | null;
  dateAvailable: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  landArea: number | null;
  buildingArea: number | null;
  headline: string | null;
  // Raw description (rendered by the client via descriptionToHtml after escape).
  description: string | null;
  features: string[];
  images: string[];
  floorplans: string[];
  inspectionTimes: string[];
  imageAlt: string;
  agencyName: string | null;
  agencyLicence: string | null;
  agencyKey: string | null;
  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  modTime: string | null;
}

// The CLIENT-FACING shape for a recently sold listing. Carries only a
// pre-sanitised soldPriceDisplay string; no raw sold_price numeric.
export interface RecentlySoldDTO {
  id: string;
  slug: string;
  listingType: string;
  propertyType: string | null;
  status: string | null;
  addressLine: string;
  suburb: string | null;
  suburbDisplay: boolean;
  soldPriceDisplay: string;
  soldDate: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  landArea: number | null;
  headline: string | null;
  features: string[];
  images: string[];
  imageAlt: string;
  agencyName: string | null;
  agencyLicence: string | null;
  agentName: string | null;
  isOwnerStock: boolean;
}

// The four kinds of notice a family or funeral director can submit. Every
// notice is moderated (status='approved') and published before it is read.
export type ObituaryNoticeType = "death_notice" | "obituary" | "funeral_notice" | "tribute";

export const OBITUARY_NOTICE_LABELS: Record<ObituaryNoticeType, string> = {
  death_notice: "Death notice",
  obituary: "Obituary",
  funeral_notice: "Funeral notice",
  tribute: "Tribute",
};

// A published, approved obituary or death notice. There are NO submitter PII
// columns (submitter name, email, phone) on this row by design: only the
// details the family chose to publish about the person are read here.
export interface ObituaryRow {
  id: string;
  city: string;
  full_name: string;
  preferred_name: string | null;
  date_of_death: string | null;
  age: number | null;
  suburb: string | null;
  notice_type: ObituaryNoticeType;
  body_html: string | null;
  service_details: string | null;
  funeral_director: string | null;
  funeral_director_url: string | null;
  photo_url: string | null;
  slug: string | null;
  source_url: string | null;
  status: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}
