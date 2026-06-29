# World-city domain shortlist (2026-06-28)

Snapshot to support the international expansion of the Daily Network.

> **Method caveat:** the dev environment blocks WHOIS/RDAP, so availability here is
> inferred from **DNS resolution**. `taken` = the domain resolves (reliably
> registered). `likely-free` = no DNS record, which *usually* means available but
> is **not authoritative** — a domain can be registered without DNS. **Confirm every
> "likely-free" pick at a registrar before purchase.**

## Wired into the network now (as draft / noindex cities)

These 18 cities are added to `src/lib/city-config.ts` and `DRAFT_CITY_SLUGS`, so
their domains resolve to the existing deploy and they are ready to launch — but
they stay out of search until they have real local content.

| City | Domain pinned in config | `daily<city>.com` status |
|------|------------------------|--------------------------|
| London | `dailylondon.news` | .com taken → `.news` |
| Singapore | `dailysingapore.news` | .com taken → `.news` |
| Hong Kong | `dailyhongkong.news` | .com taken → `.news` |
| Dublin | `dailydublin.com` | likely-free |
| Auckland | `dailyauckland.com` | likely-free |
| Wellington | `dailywellington.com` | likely-free |
| Vancouver | `dailyvancouver.com` | likely-free |
| Manchester | `dailymanchester.com` | likely-free |
| Cape Town | `dailycapetown.com` | likely-free |
| Johannesburg | `dailyjohannesburg.com` | likely-free |
| Nairobi | `dailynairobi.com` | likely-free |
| Lagos | `dailylagos.com` | likely-free |
| Mumbai | `dailymumbai.com` | likely-free |
| Bangalore | `dailybangalore.com` | likely-free |
| Manila | `dailymanila.com` | likely-free |
| Kuala Lumpur | `dailykualalumpur.com` | likely-free |
| Bangkok | `dailybangkok.com` | likely-free |
| Amsterdam | `dailyamsterdam.com` | likely-free |

## Flagship `.com` is taken — alternates checked

| City | Taken | Free alternates found |
|------|-------|-----------------------|
| London | `dailylondon.com`, `thedailylondon.com`, `londondaily.com`, `dailylondonnews.com` | `dailylondon.news`, `dailylondon.co` |
| Singapore | `dailysingapore.com`, `thesingaporedaily.com`, `dailysingaporenews.com` | `dailysingapore.news`, `dailysingapore.co`, `thedailysingapore.com`, `singaporedaily.com` |
| Hong Kong | `dailyhongkong.com`, `hongkongdaily.com`, `thehongkongdaily.com` | `dailyhongkong.news`, `dailyhongkong.co`, `thedailyhongkong.com`, `dailyhongkongnews.com` |

`.news` was free for every priority city checked — a consistent global TLD scheme.

## Other major-city `.com` already taken (not added)

Toronto, Montreal, Edinburgh, Birmingham, Glasgow, Dubai, Abu Dhabi, Doha, Delhi,
Tokyo, Berlin, Paris — would need a `.news`/`.co` or alternate naming decision.

## Next steps to actually launch a city

1. **Register** the chosen domain(s) and confirm availability via the registrar
   (the DNS check above is indicative only).
2. **Point DNS** at the existing deploy — no new Lovable project needed; one deploy
   serves every city via hostname resolution (`resolveCityFromHost`).
3. **Add content** (the city must have genuine local articles/events).
4. **Launch:** remove the slug from `DRAFT_CITY_SLUGS` → it becomes indexable and
   appears on the public `/network` page automatically.

## Launch-time follow-ups (only matter once a city is indexed)

- `src/routes/article.$slug.tsx` JSON-LD hardcodes `Country: "Australia"` in
  `areaServed` — needs to be country-aware for international cities.
- Currency (`formatAud`), locale (`en_AU`), and the GA4 hostname bootstrap in
  `__root.tsx` are AU-specific and would need per-city handling before a non-AU
  city goes fully live.
