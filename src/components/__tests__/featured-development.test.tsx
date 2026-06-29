// Verifies the FeaturedDevelopment section against mocked Lawson feed
// placements:
// - graceful degrade: empty placements renders nothing
// - sponsored disclosure label appears verbatim near each placement
// - "Price on application" is shown; no dollar values rendered
// - exactly ONE contextual outbound link to The Lawson per house placement
// - self-canonical link points at this site, never at The Lawson
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FeaturedDevelopment } from "@/components/FeaturedDevelopment";
import type { FeaturedDevelopmentPlacement } from "@/lib/featured-development.functions";

const house: FeaturedDevelopmentPlacement = {
  id: "house-1",
  slot_type: "house_display",
  project_name: "The Ainslie Rise",
  suburb: "Braddon",
  developer: "Lawson Group",
  image_url: "https://cdn.thelawson.example/ainslie-rise.jpg",
  fact_summary: "Five storeys, 42 apartments, completion late 2027.",
  self_canonical_url: "https://dailycanberra.com.au/featured/the-ainslie-rise",
  lawson_link_url: "https://thelawson.com.au/projects/the-ainslie-rise",
  disclosure_label: "Sponsored by The Lawson. Daily Canberra editorial is independent.",
};

const newsletter: FeaturedDevelopmentPlacement = {
  id: "news-1",
  slot_type: "newsletter_sponsor",
  project_name: "Kingston Quay",
  suburb: "Kingston",
  developer: "Lawson Group",
  image_url: null,
  fact_summary: null,
  self_canonical_url: "https://dailycanberra.com.au/featured/kingston-quay",
  lawson_link_url: "https://thelawson.com.au/projects/kingston-quay",
  disclosure_label: "Briefing sponsor: The Lawson. Editorial independence retained.",
};

describe("FeaturedDevelopment", () => {
  it("renders nothing when placements are empty (graceful degrade)", () => {
    expect(renderToStaticMarkup(<FeaturedDevelopment placements={[]} />)).toBe("");
  });

  it("renders nothing when no recognised slots are present", () => {
    const bogus = { ...house, slot_type: "unknown" as never };
    expect(renderToStaticMarkup(<FeaturedDevelopment placements={[bogus]} />)).toBe("");
  });

  it("shows sponsored disclosure verbatim from the feed", () => {
    const html = renderToStaticMarkup(
      <FeaturedDevelopment placements={[house, newsletter]} />,
    );
    expect(html).toContain(house.disclosure_label);
    expect(html).toContain(newsletter.disclosure_label);
    expect(html).toContain("Sponsored");
  });

  it("renders price-on-application only — no dollar amounts", () => {
    const html = renderToStaticMarkup(<FeaturedDevelopment placements={[house]} />);
    expect(html).toContain("Price on application");
    expect(html).not.toMatch(/\$\s?\d/);
  });

  it("emits exactly ONE outbound link to The Lawson per house placement", () => {
    const html = renderToStaticMarkup(<FeaturedDevelopment placements={[house]} />);
    const lawsonLinks = html.match(/href="https:\/\/thelawson\.com\.au[^"]*"/g) ?? [];
    expect(lawsonLinks).toHaveLength(1);
    expect(html).toContain('rel="sponsored noopener"');
    expect(html).toContain('target="_blank"');
  });

  it("self-canonical points at this site, not at The Lawson", () => {
    const html = renderToStaticMarkup(<FeaturedDevelopment placements={[house]} />);
    expect(html).toContain(`href="${house.self_canonical_url}"`);
    expect(html).toContain('rel="canonical"');
  });

  it("renders project name, suburb context and fact summary", () => {
    const html = renderToStaticMarkup(<FeaturedDevelopment placements={[house]} />);
    expect(html).toContain("The Ainslie Rise");
    expect(html).toContain("Braddon");
    expect(html).toContain("Five storeys, 42 apartments");
  });

  it("includes the enquiry form posting to the server proxy", () => {
    const html = renderToStaticMarkup(<FeaturedDevelopment placements={[house]} />);
    expect(html).toContain('name="email"');
    expect(html).toContain('name="company_website"'); // honeypot
    expect(html).toContain("Send enquiry");
  });
});
