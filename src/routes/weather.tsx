// Flagship /weather page. Server-rendered for SEO: the loader prefetches the
// Open-Meteo forecast (cached ~15min on the server) so current conditions, the
// next-24-hour timeline and the 7-day strip ship in the initial HTML. Designed
// editorially: smart local advisories, a clean current panel with sun times and
// UV, an hourly strip, the 7-day outlook, three original local explainers, then
// a latest-news strip tying weather into news. No Bureau of Meteorology branding.
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, citySlug, cityTimezone, siteName, cityCoords } from "@/lib/city";
import {
  getCityWeather,
  describeWeather,
  windCompass,
  uvCategory,
  computeWeatherAlerts,
  aqiCategory,
  moonPhase,
  composeSummary,
  type WeatherAlert,
} from "@/lib/weather.functions";
import { getHomepage } from "@/lib/data.functions";
import { RadarMap } from "@/components/RadarMap";
import { WeatherScene } from "@/components/WeatherScene";
import { NewsletterForm } from "@/components/NewsletterForm";
import { WeatherInstallPrompt } from "@/components/WeatherInstallPrompt";

const weatherQuery = queryOptions({
  queryKey: [`${citySlug()}-weather`],
  queryFn: () => getCityWeather(),
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});

const homepageQuery = queryOptions({
  queryKey: ["homepage"],
  queryFn: () => getHomepage(),
});

export const Route = createFileRoute("/weather")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(weatherQuery),
      context.queryClient.ensureQueryData(homepageQuery).catch(() => undefined),
    ]);
  },
  head: () => {
    const title = `${cityName()} Weather Today - Forecast, Radar & 14-Day Outlook | ${siteName()}`;
    const description = `Live ${cityName()} weather forecast and rain radar. Current conditions, hourly outlook, 7-day and 14-day forecast, UV index and air quality - updated every 30 minutes.`;
    return {
      meta: buildMeta({ title, description, path: "/weather" }),
      links: canonicalLinks("/weather"),
    };
  },
  component: WeatherPage,
});

// Canberra-specific local weather essays. Shown only on the Canberra build;
// other cities get the neutral, city-agnostic explainers below.
const CANBERRA_EXPLAINERS = [
  {
    headline: "Why Canberra mornings are the coldest in the country",
    body: "Canberra sits on a high inland plain, about 580 metres above sea level, ringed by hills that trap cool air at night. On clear winter evenings the heat the city absorbed during the day radiates straight back up into a dry, cloudless sky, while the surrounding ranges funnel pooled cold air down into the basin where the suburbs sit. Add a southerly off the Snowy Mountains and a frost can settle on Tuggeranong and Gungahlin well before dawn. That same geography is why the temperature can climb fifteen degrees by lunchtime: once the sun clears Mount Ainslie, the dry continental air warms quickly. It is a pattern locals know well — a coat at 7am, sleeves rolled up by midday. Compared with coastal capitals, where the ocean keeps overnight lows mild, Canberra's inland setting gives the city the sharpest daily temperature swing of any Australian capital, and the most reliable bite of frost between May and August.",
  },
  {
    headline: "Canberra's coldest and warmest months, and what to expect",
    body: "July is reliably the coldest month in Canberra. Overnight lows hover around zero, frosts are routine, and the average daytime maximum sits in the low teens. Mornings often start under fog that drifts in from the Molonglo and lifts by mid-morning to reveal a sharp blue sky. June and August feel similar; both deliver crisp, still days that are excellent for walking once the sun is up. At the other end of the calendar, January is the warmest month. Daytime maximums average in the high twenties and stretch into the mid-thirties during heat spells, with low humidity that makes the heat feel dry rather than oppressive. Evenings cool off quickly thanks to the elevation, so even hot January days end with a comfortable night. Spring and autumn are the transitional months, with wide daily ranges, occasional thunderstorms in spring and the famous clear, still autumn afternoons that turn the city's deciduous streets gold.",
  },
  {
    headline: "The best time of year to visit Canberra",
    body: "If the question is when Canberra is at its prettiest, the answer is autumn. From mid-April through May the city's planted avenues — oaks, planes, ornamental pears, claret ashes — turn through yellow, orange and deep red, and the dry inland air keeps the leaves on the branches longer than coastal cities manage. Days are mild, nights are cool and the light is soft. Spring, from late September into November, is the other strong window: Floriade fills Commons Park, the lake foreshore greens up and warmer afternoons make Mount Ainslie and the Arboretum easy walks. Summer suits visitors who want long evenings, outdoor concerts and lake swims, with the trade-off of occasional very hot days. Winter is quiet and atmospheric, and a good time for galleries, the National Library and a long lunch indoors. For first-time visitors, late April to mid-May or early October is usually the sweet spot: cooperative weather, full programs at the national institutions, and the city looking its best.",
  },
];

// City-agnostic weather explainers used for every non-Canberra build. They use
// the city name but carry no city-specific geography, so they read correctly
// from VITE_SITE_CITY alone.
function neutralExplainers(city: string) {
  return [
    {
      headline: `How to read the ${city} forecast`,
      body: `A good forecast is really three views at once. The current panel tells you what it feels like outside right now, which is what matters before you head out the door. The hourly strip is for planning the next part of your day: when the rain band arrives, when the wind picks up, when it is warm enough to walk. The seven-day outlook is for the week ahead, and it is most reliable in the first three or four days. Read it from the top down and you will almost always have what you need for ${city}.`,
    },
    {
      headline: "What the UV index actually means",
      body: "The UV index rates the strength of the sun's ultraviolet radiation on a simple scale. Below 3 is low and you can be outside safely without protection. From 3 to 7 is moderate to high, the point at which sunburn becomes likely within an hour, so a hat and sunscreen earn their keep. Above 8 is very high to extreme, and skin can burn in minutes around the middle of the day. The index peaks at solar noon, not at the hottest part of the afternoon, so the safest habit is to check the number rather than judge by the temperature.",
    },
    {
      headline: "Why the overnight low matters as much as the high",
      body: "Daytime maximums get the headlines, but the overnight minimum shapes how the day actually feels. A cold night means a slow, crisp start and, on clear evenings, the chance of fog or frost before dawn. A mild night means the warmth carries over and the morning is comfortable from the outset. Clear skies let heat escape and push the low down; cloud cover traps it and keeps the night warmer. That is why two days with the same maximum can feel completely different depending on the night that came before.",
    },
  ];
}

// Presentation-only formatters. Open-Meteo returns local "YYYY-MM-DDTHH:MM"
// strings in the requested timezone, so we read the clock parts directly rather
// than constructing Dates (which would re-interpret them in the server's zone).
function formatHour(iso: string): string {
  const h = Number(iso.slice(11, 13));
  if (Number.isNaN(h)) return "";
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return `${hh}${ampm}`;
}

function formatClock(iso: string): string {
  const hm = iso.slice(11, 16);
  if (!hm || !hm.includes(":")) return "—";
  const [hStr, m] = hm.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return "—";
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return `${hh}:${m} ${ampm}`;
}

// Daylight length from two local "YYYY-MM-DDTHH:MM" strings, read directly off
// the clock parts (no Date construction, so no timezone re-interpretation).
function daylightLength(sunrise: string, sunset: string): string {
  const mins = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  const diff = mins(sunset) - mins(sunrise);
  if (!Number.isFinite(diff) || diff <= 0) return "—";
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

const ALERT_TONES: Record<WeatherAlert["tone"], { color: string; bg: string }> = {
  warn: { color: "#A32D2D", bg: "rgba(163,45,45,0.06)" },
  cool: { color: "#2f6b8a", bg: "rgba(47,107,138,0.07)" },
  info: { color: "var(--ink)", bg: "transparent" },
};

const AQI_TONES: Record<"good" | "fair" | "warn" | "bad", string> = {
  good: "#2f7a4d",
  fair: "#8a6d1f",
  warn: "#A35a2d",
  bad: "#A32D2D",
};

function WeatherPage() {
  const { data: weather } = useSuspenseQuery(weatherQuery);
  const { data: homepage } = useSuspenseQuery(homepageQuery);
  const isCanberra = citySlug() === "canberra";
  const explainers = isCanberra ? CANBERRA_EXPLAINERS : neutralExplainers(cityName());
  const current = weather.current;
  const today = weather.daily[0];
  const daily = weather.daily.slice(0, 7);
  const hourly = weather.hourly.slice(0, 24);
  const alerts = computeWeatherAlerts(weather);
  const airQuality = weather.airQuality;
  const summary = weather?.briefing || composeSummary(weather);
  const moon = moonPhase(new Date());
  const articles = (homepage?.articles ?? []).slice(0, 6);

  const pageTitle = `${cityName()} weather radar and forecast | ${siteName()}`;
  const pageDescription = `Live ${cityName()} rain radar, current conditions, hourly outlook, 7-day forecast, UV, air quality and sun and moon times, with original local weather writing from ${siteName()}.`;
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: absUrl("/weather"),
    about: { "@type": "Place", name: `${cityName()}, Australia` },
  };

  const [cityLat, cityLon] = cityCoords();
  const weatherForecastLd = {
    "@context": "https://schema.org",
    "@type": "WeatherForecast",
    name: `${cityName()} Weather Today`,
    description: `Live weather forecast for ${cityName()}`,
    url: absUrl("/weather"),
    areaServed: {
      "@type": "City",
      name: cityName(),
      geo: {
        "@type": "GeoCoordinates",
        latitude: cityLat,
        longitude: cityLon,
      },
    },
  };
  const articleLd = explainers.map((e) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: e.headline,
    articleBody: e.body,
    author: { "@type": "Organization", name: siteName() },
    publisher: { "@type": "Organization", name: siteName() },
    mainEntityOfPage: absUrl("/weather"),
  }));

  return (
    <>
      <SiteHeader activePath="/weather" />
      <JsonLd data={webPageLd} />
      <JsonLd data={weatherForecastLd} />
      {articleLd.map((d, i) => (
        <JsonLd key={i} data={d} />
      ))}

      <main className="container-news py-10">
        {/* Page head */}
        <header className="text-center max-w-3xl mx-auto">
          <p className="kicker">Weather</p>
          <h1 className="h1-news mt-2">{cityName()} Weather Today</h1>
          <p className="dek mt-3" style={{ fontFamily: "Georgia, serif" }}>
            Live rain radar, current conditions, an hour-by-hour outlook and a seven-day forecast
            for {cityName()}, with original writing about the city's climate from {siteName()}.
          </p>
        </header>

        {/* Smart advisories */}
        {alerts.length > 0 && (
          <ul aria-label="Weather advisories" className="mt-6 flex flex-wrap justify-center gap-2">
            {alerts.map((a) => {
              const tone = ALERT_TONES[a.tone];
              return (
                <li
                  key={a.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] leading-tight border"
                  style={{ color: tone.color, borderColor: tone.color, background: tone.bg }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: tone.color }}
                  />
                  {a.text}
                </li>
              );
            })}
          </ul>
        )}

        {/* Today's briefing (deterministic now; AI narrative when wired) */}
        {summary && (
          <section
            aria-label="Today's weather briefing"
            className="mt-8 max-w-3xl mx-auto text-center"
          >
            <p className="kicker">Today's briefing</p>
            <p
              className="mt-2 serif text-xl leading-relaxed"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {summary}
            </p>
          </section>
        )}

        {/* Animated weather scene — illustrates current conditions at a glance,
            in the spirit of Google's weather panel. Vector + CSS, not a GIF. */}
        {current && (
          <section aria-label="Current conditions illustration" className="mt-8">
            <WeatherScene
              code={current.weatherCode}
              isDay={current.isDay}
              className="h-44 sm:h-52"
              caption={`${describeWeather(current.weatherCode).label} · ${Math.round(current.temperature)}° in ${cityName()}`}
            />
          </section>
        )}

        {/* Current conditions panel */}
        <section aria-label="Current conditions" className="mt-8 border-y border-[var(--ink)] py-8">
          {current ? (
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
              <div className="flex items-center gap-6">
                <div className="text-6xl md:text-7xl" aria-hidden>
                  {describeWeather(current.weatherCode).icon}
                </div>
                <div>
                  <div className="serif font-semibold leading-none" style={{ fontSize: "4.5rem" }}>
                    {Math.round(current.temperature)}°
                  </div>
                  <p className="meta mt-2">
                    {describeWeather(current.weatherCode).label} · feels like{" "}
                    {Math.round(current.apparent)}°
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                {today && (
                  <Stat
                    label="Today"
                    value={`${Math.round(today.max)}° / ${Math.round(today.min)}°`}
                  />
                )}
                <Stat label="Humidity" value={`${Math.round(current.humidity)}%`} />
                <Stat
                  label="Wind"
                  value={`${Math.round(current.windSpeed)} km/h ${windCompass(current.windDirection)}`}
                />
                <Stat
                  label="UV index"
                  value={`${Math.round(current.uvIndex)} · ${uvCategory(current.uvIndex)}`}
                />
                {today?.sunrise && <Stat label="Sunrise" value={formatClock(today.sunrise)} />}
                {today?.sunset && <Stat label="Sunset" value={formatClock(today.sunset)} />}
                <Stat
                  label="Updated"
                  value={new Date(weather.fetchedAt).toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: cityTimezone(),
                  })}
                />
              </dl>
            </div>
          ) : (
            <p className="meta text-center">
              Live conditions are unavailable right now. Please refresh shortly.
            </p>
          )}
        </section>

        {/* Hourly strip — next 24 hours */}
        {hourly.length > 0 && (
          <section aria-label="Hourly forecast" className="mt-8">
            <h2 className="label">Next 24 hours</h2>
            <div className="mt-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <ol className="flex gap-2 min-w-max pb-1">
                {hourly.map((hr, i) => {
                  const w = describeWeather(hr.weatherCode);
                  return (
                    <li
                      key={hr.time}
                      className="flex-none w-[64px] border border-[var(--hairline)] px-2 py-3 text-center"
                    >
                      <p className="meta font-semibold">{i === 0 ? "Now" : formatHour(hr.time)}</p>
                      <p className="text-xl mt-1.5" aria-hidden>
                        {w.icon}
                      </p>
                      <p className="serif font-semibold mt-1.5">{Math.round(hr.temperature)}°</p>
                      <p className="meta opacity-70 mt-1">{Math.round(hr.precipProb)}%</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        {/* Interactive rain radar */}
        <section aria-label="Rain radar" className="mt-10">
          <div className="flex items-baseline justify-between border-b border-[var(--ink)] pb-2">
            <h2 className="label">Live rain radar</h2>
            <span className="meta opacity-60">Drag to pan, scroll the page over it</span>
          </div>
          <div className="mt-3">
            <RadarMap />
          </div>
        </section>

        {/* Weather-framed newsletter CTA — intent-matched: they came for the
            forecast, so we offer the forecast in their inbox. Placed mid-page,
            after the value (current + hourly + radar) and before the bounce. */}
        <section
          aria-label="Get the forecast by email"
          className="mt-10 border border-[var(--hairline)] bg-[var(--surface)] p-6 sm:p-8"
        >
          <NewsletterForm
            source="weather"
            variant="band"
            title={`Tomorrow's ${cityName()} forecast, in your inbox`}
            blurb={`Wake up to the day's forecast and the morning's top ${cityName()} stories — a 2-minute read, every weekday. Free.`}
          />
        </section>

        {/* 7-day strip */}
        {daily.length > 0 && (
          <section aria-label="Seven-day forecast" className="mt-8">
            <h2 className="label">Seven-day forecast</h2>
            <ol className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {daily.map((d) => {
                const w = describeWeather(d.weatherCode);
                const day = new Date(d.date + "T00:00:00").toLocaleDateString("en-AU", {
                  weekday: "short",
                  timeZone: cityTimezone(),
                });
                return (
                  <li key={d.date} className="border border-[var(--hairline)] p-3 text-center">
                    <p className="meta font-semibold">{day}</p>
                    <p className="text-2xl mt-1" aria-hidden>
                      {w.icon}
                    </p>
                    <p className="meta mt-1 opacity-80">{w.label}</p>
                    <p className="mt-2 serif">
                      <span className="font-semibold">{Math.round(d.max)}°</span>{" "}
                      <span className="opacity-60">{Math.round(d.min)}°</span>
                    </p>
                    <p className="meta opacity-70 mt-1">Rain {Math.round(d.precipProb)}%</p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Air quality + sun and moon */}
        {((airQuality && airQuality.usAqi != null) || today) && (
          <section
            aria-label="Air quality, sun and moon"
            className="mt-8 grid gap-4 sm:grid-cols-2"
          >
            {airQuality && airQuality.usAqi != null && (
              <div className="border border-[var(--hairline)] p-5">
                <h2 className="label">Air quality</h2>
                {(() => {
                  const cat = aqiCategory(airQuality.usAqi);
                  const tone = AQI_TONES[cat.tone];
                  return (
                    <div className="mt-3 flex items-center gap-4">
                      <div
                        className="serif font-semibold leading-none"
                        style={{ fontSize: "3rem", color: tone }}
                      >
                        {Math.round(airQuality.usAqi)}
                      </div>
                      <div>
                        <p className="serif font-semibold" style={{ color: tone }}>
                          {cat.label}
                        </p>
                        <p className="meta mt-1 opacity-70">US AQI</p>
                      </div>
                    </div>
                  );
                })()}
                <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  {airQuality.pm2_5 != null && (
                    <Stat label="PM2.5" value={`${Math.round(airQuality.pm2_5)}`} />
                  )}
                  {airQuality.pm10 != null && (
                    <Stat label="PM10" value={`${Math.round(airQuality.pm10)}`} />
                  )}
                  {airQuality.ozone != null && (
                    <Stat label="Ozone" value={`${Math.round(airQuality.ozone)}`} />
                  )}
                </dl>
                <p className="meta mt-3 opacity-60">Air quality by Open-Meteo (CAMS), in µg/m³.</p>
              </div>
            )}
            {today && (
              <div className="border border-[var(--hairline)] p-5">
                <h2 className="label">Sun and moon</h2>
                <div className="mt-3 grid grid-cols-2 gap-4 items-center">
                  <dl className="space-y-2 text-sm">
                    {today.sunrise && <Stat label="Sunrise" value={formatClock(today.sunrise)} />}
                    {today.sunset && <Stat label="Sunset" value={formatClock(today.sunset)} />}
                    {today.sunrise && today.sunset && (
                      <Stat label="Daylight" value={daylightLength(today.sunrise, today.sunset)} />
                    )}
                  </dl>
                  <div className="text-center">
                    <div className="text-5xl" aria-hidden>
                      {moon.icon}
                    </div>
                    <p className="serif font-semibold mt-1">{moon.name}</p>
                    <p className="meta opacity-70 mt-1">{moon.illumination}% lit</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Editorial pieces */}
        <section aria-label={`${cityName()} weather, explained`} className="mt-14">
          <header className="text-center max-w-2xl mx-auto">
            <p className="kicker">From the weather desk</p>
            <h2 className="h2-news mt-2">{cityName()} weather, explained</h2>
          </header>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {explainers.map((e) => (
              <article key={e.headline}>
                <h3 className="serif text-xl font-semibold leading-snug">{e.headline}</h3>
                <div
                  className="mt-3 hairline-rule"
                  style={{
                    borderTop: "1px solid var(--hairline)",
                    width: "2rem",
                  }}
                  aria-hidden
                />
                <p
                  className="mt-3 text-[15px] leading-relaxed"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {e.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Severe-weather alerts opt-in — a distinct, weather-specific promise.
            Reuses the newsletter pipeline but tags the subscriber
            (wants_weather_alerts) so a dedicated alert send can target them. */}
        <section
          aria-label="Severe weather alerts sign-up"
          className="mt-14 border-l-2 border-[var(--ink-red)] bg-[var(--surface)] p-6 sm:p-8"
        >
          <NewsletterForm
            source="weather-alerts"
            variant="band"
            wantsWeatherAlerts
            title={`${cityName()} severe weather alerts`}
            blurb={`Get a heads-up when frost, storms or extreme heat are on the way for ${cityName()} — flagged in your morning brief. Free, unsubscribe anytime.`}
          />
        </section>

        {/* Latest news strip */}
        {articles.length > 0 && (
          <section aria-label={`Latest ${cityName()} news`} className="mt-14">
            <header className="flex items-baseline justify-between border-b border-[var(--ink)] pb-2">
              <h2 className="label">Latest from the newsroom</h2>
              <Link to="/" className="meta no-underline hover:underline">
                See all news →
              </Link>
            </header>
            <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <li key={a.id} className="border-b border-[var(--hairline)] pb-4">
                  <a
                    href={`/article/${a.slug}`}
                    className="serif text-lg font-semibold leading-snug no-underline text-[var(--ink)] hover:text-[var(--ink-red)]"
                  >
                    {a.title}
                  </a>
                  {a.dek && (
                    <p className="mt-2 text-sm opacity-80" style={{ fontFamily: "Georgia, serif" }}>
                      {a.dek}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Add-to-home-screen / bookmark nudge — captures repeat-visit intent
            without an email. Renders nothing if already installed or dismissed. */}
        <WeatherInstallPrompt className="mt-14" />

        {/* Attribution */}
        <p className="meta mt-12 text-center opacity-70">
          Weather data by{" "}
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open-Meteo
          </a>
          . {siteName()} is independent and not affiliated with any government weather agency.
        </p>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="meta opacity-70">{label}</dt>
      <dd className="serif text-lg font-semibold">{value}</dd>
    </div>
  );
}
