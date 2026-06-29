import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import {
  QueryClient,
  QueryClientProvider,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { siteName, siteTagline, siteDomain, cityName, cityAccent, cityCoords, citySlug, citySocialLinks, cityLaunched , cityBcp47 } from "../lib/city";
import { SiteFooter } from "../components/SiteFooter";
import { LangProvider } from "../lib/i18n";
import { LanguageSuggestBanner } from "../components/LanguageSuggestBanner";
import { slugToNativeLang } from "../lib/city-config";
import { ScrollTriggeredCTA } from "../components/ScrollTriggeredCTA";
import { ExitIntentPopup } from "../components/ExitIntentPopup";
import { WeekendEditionPopup } from "../components/WeekendEditionPopup";
import { PushNotifyPrompt } from "../components/PushNotifyPrompt";
import { LoyaltyBar } from "../components/LoyaltyBar";
import { NetworkStrip } from "../components/NetworkStrip";
import { CookieConsent } from "../components/CookieConsent";
import { ReadCountNudge } from "../components/ReadCountNudge";



import { StickyNewsletterBar } from "../components/StickyNewsletterBar";
import { AskCanberraLauncher } from "../components/AskCanberraLauncher";
import { PageViewTracker } from "../components/PageViewTracker";
import { EnvPreflightBanner } from "../components/EnvPreflightBanner";
import { BreakingNewsBanner } from "../components/BreakingNewsBanner";
import { NewsTicker } from "../components/NewsTicker";
import { FailureBanner } from "../components/FailureBanner";
import { SkipToContent } from "../components/SkipToContent";
import { LoyaltyMilestone } from "../components/LoyaltyMilestone";
import { NotFoundContent } from "../components/NotFoundContent";

// Canberra keeps its existing hand-crafted share card. All other cities use a
// per-city 1200x630 PNG generated from the city's accent + masthead lockup, so
// a clone never ships Canberra's preview image to Facebook/X. Article and
// detail pages still override og:image with their own hero (see lib/seo.ts).
import ogImageAsset from "../assets/canberra-og.jpg.asset.json";
import ogSydney from "../assets/og-sydney.png.asset.json";
import ogMelbourne from "../assets/og-melbourne.png.asset.json";
import ogPerth from "../assets/og-perth.png.asset.json";
import ogBrisbane from "../assets/og-brisbane.png.asset.json";
import ogGoldcoast from "../assets/og-goldcoast.png.asset.json";
import ogTasmania from "../assets/og-tasmania.png.asset.json";
import ogAdelaide from "../assets/og-adelaide.png.asset.json";
import ogNewcastle from "../assets/og-newcastle.png.asset.json";
import ogWollongong from "../assets/og-wollongong.png.asset.json";
import ogCentralcoast from "../assets/og-centralcoast.png.asset.json";
import ogSunshinecoast from "../assets/og-sunshinecoast.png.asset.json";
import ogGeelong from "../assets/og-geelong.png.asset.json";
import ogTownsville from "../assets/og-townsville.png.asset.json";
import ogDarwin from "../assets/og-darwin.png.asset.json";
import ogToowoomba from "../assets/og-toowoomba.png.asset.json";
import ogBallarat from "../assets/og-ballarat.png.asset.json";
import ogBendigo from "../assets/og-bendigo.png.asset.json";
import ogCairns from "../assets/og-cairns.png.asset.json";
const OG_BY_CITY: Record<string, { url: string }> = {
  canberra: ogImageAsset,
  sydney: ogSydney,
  melbourne: ogMelbourne,
  perth: ogPerth,
  brisbane: ogBrisbane,
  goldcoast: ogGoldcoast,
  tasmania: ogTasmania,
  adelaide: ogAdelaide,
  newcastle: ogNewcastle,
  wollongong: ogWollongong,
  centralcoast: ogCentralcoast,
  sunshinecoast: ogSunshinecoast,
  geelong: ogGeelong,
  townsville: ogTownsville,
  darwin: ogDarwin,
  toowoomba: ogToowoomba,
  ballarat: ogBallarat,
  bendigo: ogBendigo,
  cairns: ogCairns,
};
import favicon16 from "../assets/favicon-16.png.asset.json";
import favicon32 from "../assets/favicon-32.png.asset.json";
import favicon48 from "../assets/favicon-48.png.asset.json";
import favicon96 from "../assets/favicon-96.png.asset.json";
import favicon192 from "../assets/favicon-192.png.asset.json";
import appleTouchIcon from "../assets/apple-touch-icon.png.asset.json";
// GA4 is loaded via a hostname-gated inline bootstrap in head scripts below.
// Only domains present in the map receive a gtag tag; all others load nothing.
// eslint-disable-next-line no-useless-escape
const GA4_HOSTNAME_BOOTSTRAP = `(function(){try{if(window.__ga4Bootstrapped)return;var map={"dailycanberra.com.au":"G-GT1V5ZBWCM","dailysydney.com.au":"G-7NHKXC75ZB","dailymelbourne.com.au":"G-2G3BT4P78P","dailybrisbane.com.au":"G-CZ8XMMP8N5","dailygoldcoast.com.au":"G-Z1GPQMJLG2","dailyperth.com.au":"G-3Z80958Z6E","dailyadelaide.com.au":"G-6WWX4QRVF4","dailytasmania.com.au":"G-W75RC3R6W6","dailywollongong.com.au":"G-M0T3N2RBTY","dailydarwin.com.au":"G-Z7QER5GZKN","dailynewcastle.com.au":"G-5DV5R6X2ZG","dailycairns.com.au":"G-M84JS9LHV5","dailybendigo.com.au":"G-RF759N5GXE","dailysunshinecoast.com.au":"G-KVN3DPPDMS","dailycentralcoast.com.au":"G-3BWSPC9YCG","dailyballarat.com.au":"G-6C20Z81J7B","dailytownsville.com.au":"G-L1Y42ZDRHP","dailygeelong.com.au":"G-VXS5SG54XH","dailytoowoomba.com.au":"G-96ZETBBYTW"};var h=(location.hostname||"").toLowerCase().replace(/^www\./,"");var id=map[h];if(!id)return;window.__ga4Bootstrapped=true;var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+id;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag("js",new Date());gtag("config",id);}catch(e){}})();`;
import { getDesignTokenCss } from "../lib/design-tokens.functions";

const designTokenQuery = queryOptions({
  queryKey: ["design-token-css"],
  queryFn: () => getDesignTokenCss(),
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
});



function NotFoundComponent() {
  return <NotFoundContent />;
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  const subject = encodeURIComponent(`Site error on ${siteName()}`);
  const body = encodeURIComponent(
    `Hi team,

I hit an error on ${siteName()}.

Message: ${error.message}
URL: ${typeof window !== "undefined" ? window.location.href : ""}
`,
  );
  const SUPPORT_EMAIL = `support@${siteDomain().replace(/^https?:\/\//, "")}`;
  return (
    <div className="container-news py-24 text-center">
      <p className="kicker">Stop the press</p>
      <h1 className="h1-news mt-3">This page didn&apos;t load</h1>
      <div
        className="mx-auto my-5 h-px w-24"
        style={{ background: "var(--hairline)" }}
        aria-hidden
      />
      <p className="dek max-w-prose mx-auto" style={{ fontFamily: "Georgia, serif" }}>
        Something went wrong on our end. The editors have been notified. You can try again, head
        back to the front page, or get in touch.
      </p>
      {error.message ? (
        <p className="mt-3 text-xs font-mono opacity-70 break-words max-w-prose mx-auto">
          {error.message}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-primary"
        >
          Try again
        </button>
        <a href="/" className="btn-ghost">
          Go home
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`} className="btn-ghost">
          Contact support
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(designTokenQuery).catch(() => undefined);
  },
  head: () => {

    // Only emit `sameAs` when the active city actually has live social accounts
    // (currently just Canberra). Other cities omit it rather than asserting a
    // non-existent or another city's profile in structured data.
    const socialLinks = citySocialLinks();
    const [cityLat, cityLon] = cityCoords();
    const orgLd = {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      name: siteName(),
      alternateName: `Daily ${cityName()}`,
      url: siteDomain(),
      description: `Independent local news for ${cityName()} — the morning briefing, every weekday.`,
      foundingDate: "2026",
      logo: {
        "@type": "ImageObject",
        url: `${siteDomain()}/logo.svg`,
        width: 600,
        height: 120,
      },
      areaServed: {
        "@type": "City",
        name: cityName(),

        geo: {
          "@type": "GeoCoordinates",
          latitude: cityLat,
          longitude: cityLon,
        },
      },
      ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
    };
    const siteLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName(),
      url: siteDomain(),
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteDomain()}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
    return {

    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Draft (not-yet-launched) cities are kept out of search indexes until they
      // have real local content. robots.txt also disallows them. See
      // DRAFT_CITY_SLUGS in city-config.ts.
      ...(!cityLaunched() ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      { name: "theme-color", content: cityAccent() },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteName() },
      { property: "og:locale", content: cityBcp47().replace("-", "_") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "zIjVnZiEpcBUcYhqSwiusu_VJQP6CEFTDNjNhsU61fk" },
      { name: "google-site-verification", content: "n7ukK9Rhbx3oa3CKUzGkGQVZEatKGmfsxYvWLnGO29A" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: siteName().replace(/^The\s+/i, "") },
    ],

    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: favicon16.url, type: "image/png", sizes: "16x16" },
      { rel: "icon", href: favicon32.url, type: "image/png", sizes: "32x32" },
      { rel: "icon", href: favicon48.url, type: "image/png", sizes: "48x48" },
      { rel: "icon", href: favicon96.url, type: "image/png", sizes: "96x96" },
      { rel: "icon", href: favicon192.url, type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: appleTouchIcon.url, sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: `${siteName()} RSS`,
        href: "/rss.xml",
      },
      { rel: "search", type: "application/opensearchdescription+xml", href: "/search?q={searchTerms}" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        children:
          '(function(){try{var k="dc:theme";var s=localStorage.getItem(k);var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var d=s?s==="dark":m;if(d)document.documentElement.classList.add("dark");}catch(e){}})();',
      },
      {
        children: GA4_HOSTNAME_BOOTSTRAP,
      },
      {
        async: true,
        src: "https://analytics.ahrefs.com/analytics.js",
        "data-key": "t+a0XsaWCnWAWexTjmgLIQ",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(orgLd),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(siteLd),
      },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang={slugToNativeLang(citySlug()) === "en" ? cityBcp47() : slugToNativeLang(citySlug())} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { data: tokens } = useSuspenseQuery(designTokenQuery);
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
      {tokens?.css ? <style dangerouslySetInnerHTML={{ __html: tokens.css }} /> : null}
      <SkipToContent />
      <PageViewTracker />

      <EnvPreflightBanner />
      <FailureBanner />
      <BreakingNewsBanner />
      <NewsTicker />
      <LanguageSuggestBanner />
      <Outlet />
      <LoyaltyBar />
      <NetworkStrip />
      <SiteFooter />
      <ScrollTriggeredCTA />
      <WeekendEditionPopup />
      <ExitIntentPopup />
      <PushNotifyPrompt />
      <StickyNewsletterBar />
      <AskCanberraLauncher />
      <CookieConsent />
      <ReadCountNudge />

      <LoyaltyMilestone />



      </LangProvider>
    </QueryClientProvider>
  );
}

