import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = `# ${siteName()}

> Independent local news, events, and what's on in ${cityName()}. Published daily by ${siteName()}.

${siteName()} is an independent newsroom covering ${cityName()}: local news, federal politics from the capital, business, property, finance, sport, community life, and the daily diary of what's on. Every event and listing links to a verified source.

## Pages

- [Home](/): Lead stories, daily audio briefing, live feed, and what's on.
- [News](/news): All ${cityName()} news.
- [Federal](/federal): Federal politics filed from the capital.
- [Business](/business): Local business and economy.
- [Finance](/finance): Markets, money, and household finance for ${cityName()}.
- [Property](/property): ${cityName()} property and housing.
- [Sport](/sport): ${cityName()} sport coverage.
- [Community](/community): Community stories from across ${cityName()}.
- [Trending](/trending): Most-read stories right now.
- [Search](/search): Search the archive.

## What's on

- [Events](/events): Verified upcoming events across ${cityName()}.
- [This weekend](/this-weekend): Events for the coming weekend.
- [Things to do](/things-to-do): Standing guides to things to do in ${cityName()}.
- [Live feed](/live): Live updates from around the capital.

## Directory and guides

- [Business directory](/directory): Curated local businesses.
- [Best of ${cityName()}](/best): Editor-picked guides.
- [Suburb guides](/suburb/braddon): Example suburb guide.
- [Obituaries](/obituaries): Death notices and remembrances.

## About

- [About](/about): Who we are and how we work.
- [Editorial standards](/editorial-standards): Our editorial policy.
- [Contact](/contact): Get in touch.
- [Submit an event](/submit-event): Add your event.
- [Sponsor](/sponsor): Sponsor ${siteName()}.
- [Newsletter](/): Subscribe via the homepage form.

## Optional

- [Privacy](/privacy): Privacy policy.
- [Terms](/terms): Terms of use.
- [Ask ${cityName()}](/ask): Ask the newsroom a question.
`;
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
