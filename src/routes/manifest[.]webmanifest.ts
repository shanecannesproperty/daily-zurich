import { createFileRoute } from "@tanstack/react-router";
import { siteName, cityName, cityAccent, siteDomain , citySlug } from "@/lib/city"
import { slugToNativeLang } from "@/lib/city-config";;
import favicon192 from "@/assets/favicon-192.png.asset.json";
import appleTouchIcon from "@/assets/apple-touch-icon.png.asset.json";

// Web App Manifest — served at /manifest.webmanifest. Enables "Add to Home Screen"
// on iOS and Android with the site's brand colours and icons. We do NOT register
// a service worker (Lovable previews need to stay clean and the platform skill
// requires guarded vite-plugin-pwa for offline behavior, which is out of scope here).
export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const name = siteName();
        const domain = siteDomain();
        const icon192 = `${domain}${favicon192.url}`;
        const icon180 = `${domain}${appleTouchIcon.url}`;
        const manifest = {
          name,
          short_name: name.replace(/^The\s+/i, "").slice(0, 12),
          description: `Your ${cityName()} morning briefing — local news, weather and events, every weekday by 7am.`,
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#f5f3ee",
          theme_color: cityAccent(),
          lang: slugToNativeLang(citySlug()),
          icons: [
            { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: icon192, sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: icon180, sizes: "180x180", type: "image/png", purpose: "any" },
          ],
        };
        return new Response(JSON.stringify(manifest, null, 2), {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
