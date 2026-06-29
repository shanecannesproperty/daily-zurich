// Cross-network strip linking to sibling Daily Network city sites. Renders
// above the SiteFooter on every page.
import { citySlug, isCityAustralian } from "@/lib/city";

interface NetworkCity {
  slug: string;
  name: string;
  url: string;
}

const AU_NETWORK: NetworkCity[] = [
  { slug: "sydney",    name: "Daily Sydney",    url: "https://dailysydney.com.au" },
  { slug: "melbourne", name: "Daily Melbourne", url: "https://dailymelbourne.com.au" },
  { slug: "brisbane",  name: "Daily Brisbane",  url: "https://dailybrisbane.com.au" },
  { slug: "canberra",  name: "Daily Canberra",  url: "https://dailycanberra.com.au" },
];

const WORLD_NETWORK: NetworkCity[] = [
  { slug: "london",    name: "Daily London",    url: "https://dailylondon.news" },
  { slug: "singapore", name: "Daily Singapore", url: "https://dailysingapore.news" },
  { slug: "hongkong",  name: "Daily Hong Kong", url: "https://dailyhongkong.news" },
  { slug: "newyork",   name: "Daily New York",  url: "https://dailynewyork.news" },
];

export function NetworkStrip() {
  const current = citySlug();
  const isAU = isCityAustralian();
  const network = isAU ? AU_NETWORK : WORLD_NETWORK;
  const others = network.filter((c) => c.slug !== current).slice(0, 3);
  const label = isAU
    ? "The Daily Network — local news across Australia"
    : "The Daily Network — independent news worldwide";
  return (
    <section
      className="border-t border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)]"
      aria-label="The Daily Network"
    >
      <div className="container-news py-6">
        <p className="kicker text-center">{label}</p>
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {others.map((c) => (
            <li key={c.slug}>
              <a
                href={c.url}
                className="serif text-lg no-underline hover:underline"
                rel="noopener"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
