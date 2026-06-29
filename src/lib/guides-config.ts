import type { ArticleCategory } from "./schema";

export interface GuideConfig {
  slug: string;
  label: string;
  category: ArticleCategory;
  titleFn: (city: string) => string;
  descFn: (city: string) => string;
  bullets: string[];
}

export const GUIDES: GuideConfig[] = [
  {
    slug: "property",
    label: "Property",
    category: "finance",
    titleFn: (city) => `${city} Property Market 2026 — Complete Guide`,
    descFn: (city) => `Everything you need to know about buying, renting and investing in ${city} property.`,
    bullets: [
      "Median house and unit prices by suburb",
      "Auction clearance rates and market trends",
      "New development and apartment pipeline",
      "First home buyer incentives and stamp duty",
      "Investment property and rental yield data",
      "Interest rate impact on local market",
    ],
  },
  {
    slug: "government",
    label: "Government & Policy",
    category: "federal",
    titleFn: (city) => `${city} Government & Policy 2026 — Complete Guide`,
    descFn: (city) => `Tracking the decisions that shape life in ${city} — budgets, policy, planning and local government.`,
    bullets: [
      "State and local government budget updates",
      "Planning and zoning decisions",
      "Infrastructure and transport projects",
      "Health and education policy",
      "Environmental and climate policy",
      "Community consultation and public comment",
    ],
  },
  {
    slug: "business",
    label: "Business & Economy",
    category: "business",
    titleFn: (city) => `${city} Business & Economy 2026 — Complete Guide`,
    descFn: (city) => `The local business landscape in ${city} — startups, jobs, major employers and economic trends.`,
    bullets: [
      "Largest employers and major industries",
      "Local startup and innovation scene",
      "Retail and hospitality trends",
      "Jobs market and unemployment data",
      "New business openings and closures",
      "Economic development and investment attraction",
    ],
  },
  {
    slug: "sport",
    label: "Sport",
    category: "sport",
    titleFn: (city) => `${city} Sport 2026 — Complete Guide`,
    descFn: (city) => `Your complete guide to sport in ${city} — local teams, results, fixtures and community sport.`,
    bullets: [
      "Professional and semi-professional team news",
      "Weekly results and standings",
      "Upcoming fixtures and events",
      "Community sport and grassroots",
      "Venue and facilities news",
      "Player transfers and signings",
    ],
  },
  {
    slug: "city-life",
    label: "City Life",
    category: "community",
    titleFn: (city) => `Living in ${city} 2026 — Complete Local Guide`,
    descFn: (city) => `The best of ${city} life — food, events, neighbourhoods, things to do and local tips.`,
    bullets: [
      "Best suburbs to live in by lifestyle",
      "Restaurants, cafes and dining guide",
      "Local events and what's on",
      "Parks, nature and outdoor activities",
      "Schools and family amenities",
      "Neighbourhood guides and community",
    ],
  },
  {
    slug: "courts",
    label: "Courts & Legal",
    category: "news",
    titleFn: (city) => `${city} Courts 2026 — Judgments & Legal News`,
    descFn: (city) => `Summaries of significant court decisions and legal news affecting ${city} and the region.`,
    bullets: [
      "Supreme and District Court judgments",
      "Magistrates Court summaries",
      "Consumer and civil tribunal decisions",
      "Criminal sentencing outcomes",
      "Regulatory and compliance actions",
      "Legal aid and community legal services",
    ],
  },
];

export function guideBySlug(slug: string): GuideConfig | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
