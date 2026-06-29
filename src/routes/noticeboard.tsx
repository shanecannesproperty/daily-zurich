// Community noticeboard — hyperlocal listings from locals. Seed content
// for launch; "Post a notice" opens an editorial mailto so we can vet
// submissions before they appear. Designed to drive weekly check-ins from
// readers who aren't here for hard news.
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/noticeboard")({
  head: () => ({
    meta: buildMeta({
      title: `${cityName()} Noticeboard — ${siteName()}`,
      description: `Local listings from locals in ${cityName()} — lost & found, garage sales, community meetings and more.`,
      path: "/noticeboard",
    }),
    links: canonicalLinks("/noticeboard"),
  }),
  component: NoticeboardPage,
});

type Notice = {
  title: string;
  category: string;
  date: string;
  description: string;
};

function postMailto() {
  const subject = encodeURIComponent("New noticeboard listing");
  const body = encodeURIComponent(
    "Please post the following on the noticeboard:\n\nTitle:\nCategory (Lost & Found / Garage Sale / Community Meeting / Local Event / Room for Rent / Other):\nDate:\nDescription:\nContact:\n",
  );
  return `mailto:hello@dailycanberra.com.au?subject=${subject}&body=${body}`;
}

function NoticeboardPage() {
  const city = cityName();
  const notices: Notice[] = [
    {
      title: "Lost: Black cat near Reid",
      category: "Lost & Found",
      date: "This week",
      description: "Friendly black cat, white paws, microchipped. Last seen near the playground. Reward for return.",
    },
    {
      title: "Big multi-family garage sale, Ainslie",
      category: "Garage Sale",
      date: "Saturday 8am–1pm",
      description: "Furniture, books, kids' clothes, garden tools. Cash only. Corner of Wakefield Ave.",
    },
    {
      title: "Community meeting: light rail stage 2B",
      category: "Community Meeting",
      date: "Next Wednesday 6pm",
      description: "Residents' association forum at the local hall. All welcome — bring questions for the planners.",
    },
    {
      title: "Free family movie night in the park",
      category: "Local Event",
      date: "Friday after sundown",
      description: "BYO blanket. PG-rated film. Free popcorn while it lasts. Run by the local rotary club.",
    },
    {
      title: "Room for rent — sunny share house",
      category: "Room for Rent",
      date: "Available 1st of the month",
      description: "Furnished room, all bills included, walking distance to bus interchange. Suit student or young pro.",
    },
    {
      title: "Volunteers needed: community garden working bee",
      category: "Volunteers",
      date: "Sunday 9am",
      description: "Help us mulch, weed and replant the spring beds. Tools, gloves and morning tea provided.",
    },
    {
      title: "Free: upright piano (you collect)",
      category: "Free Stuff",
      date: "This weekend only",
      description: "Plays well, just needs tuning. Must be collected with two strong people and a trailer.",
    },
    {
      title: "Local choir seeking new singers",
      category: "Groups & Clubs",
      date: "Rehearsals Mondays 7pm",
      description: "Mixed-voice community choir. No audition required. First rehearsal free.",
    },
  ];

  return (
    <>
      <SiteHeader activePath="/noticeboard" />
      <main className="container-news py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--ink)] pb-6">
          <div>
            <p className="kicker text-[var(--accent,#A32D2D)]">Community</p>
            <h1 className="h1-news mt-2">The {city} Noticeboard</h1>
            <p className="dek mt-2 max-w-[60ch]">
              Local listings from locals. Lost &amp; found, garage sales,
              meetings and more — vetted by the {siteName()} team before
              they go live.
            </p>
          </div>
          <a href={postMailto()} className="btn-primary no-underline">
            + Post a notice
          </a>
        </div>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {notices.map((n) => (
            <li key={n.title} className="border border-[var(--hairline,#d6d2c9)] bg-background p-5">
              <p className="kicker inline-block border border-[var(--ink)] px-2 py-0.5 text-[10px]">
                {n.category}
              </p>
              <h2 className="serif mt-3 text-lg font-semibold leading-snug">
                {n.title}
              </h2>
              <p className="meta mt-1">{n.date}</p>
              <p className="serif mt-2 text-[15px] leading-snug">{n.description}</p>
            </li>
          ))}
        </ul>

        <p className="meta mt-10">
          Notices are moderated. We reject anything commercial, abusive or
          unsafe.
        </p>
      </main>
    </>
  );
}
