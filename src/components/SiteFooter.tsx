import { cityName, citySocial, isCityAustralian, siteName, siteEmail } from "@/lib/city";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS } from "@/lib/schema";

export function SiteFooter() {
  // Social icons render ONLY for a city that has live accounts configured in
  // city-config (currently just Canberra). Cities with no `social` entry show
  // no icons rather than linking out to a non-existent or other-city account.
  const social = citySocial();
  return (
    <footer className="mt-20 border-t border-[var(--ink)] bg-[var(--surface)]">
      <div className="container-news py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="serif text-xl font-semibold">{siteName()}</p>
            <p className="meta mt-2 max-w-xs">
              Independent local news for {cityName()}. Published daily.
            </p>
          </div>
          <div>
            <p className="label">Sections</p>
            <ul className="mt-2 space-y-1">
              {ARTICLE_CATEGORIES.map((c) => (
                <li key={c}>
                  <a href={`/${c}`}>{CATEGORY_LABELS[c]}</a>
                </li>
              ))}
              <li>
                <a href="/events">Events</a>
              </li>
              <li>
                <a href="/this-weekend">This weekend</a>
              </li>
              <li>
                <a href="/things-to-do">Things to do</a>
              </li>
              <li>
                <a href="/trending">Trending</a>
              </li>
              <li>
                <a href="/best">Best of {cityName()}</a>
              </li>
              <li>
                <a href="/directory">Directory</a>
              </li>
              <li>
                <a href="/ask">Ask {cityName()}</a>
              </li>
              <li>
                <a href="/noticeboard">Noticeboard</a>
              </li>
              <li>
                <a href="/classifieds">Classifieds</a>
              </li>
              <li>
                <a href="/contribute">Contribute</a>
              </li>
              <li>
                <a href="/letters">Letters to the Editor</a>
              </li>
            </ul>

          </div>
          <div>
            <p className="label">The masthead</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a href="/subscribe">Subscribe (free)</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/newsroom">Newsroom</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
              <li>
                <a href={`mailto:${siteEmail("hello")}`}>{siteEmail("hello")}</a>
              </li>
              <li>
                <a href="/support">Support us</a>
              </li>

              <li>
                <a href="/submit-event">Submit an event</a>
              </li>
              <li>
                <a href="/editorial-standards">Editorial standards</a>
              </li>
              <li>
                <a href="/property">Property and relocation</a>
              </li>
              <li>
                <a href="/advertise">Advertise</a>
              </li>
              <li>
                <a href="/media-kit">Media kit</a>
              </li>
              <li>
                <a href="/tips">Send us a tip</a>
              </li>
              <li>
                <a href="/faq">FAQ</a>
              </li>
              <li>
                <a href="/network">The Daily Network</a>
              </li>
              <li>
                <a href="/sponsored-content-policy">Sponsored content policy</a>
              </li>

            </ul>
            <p className="label mt-5">Newsletter</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a href="/subscribe">Subscribe (free)</a>
              </li>
              <li>
                <a href="/editions">Editions</a>
              </li>
              <li>
                <a href="/newsletters">Past newsletters</a>
              </li>
              <li>
                <a href="/newsletter/archive">Newsletter Archive</a>
              </li>
              <li>
                <a href="/archive">Browse archive</a>

              </li>
              <li>
                <a href="/this-week">This week in review</a>
              </li>
              <li>
                <a href="/leaderboard">Leaderboard</a>
              </li>
              <li>
                <a href="/email-preferences">Email preferences</a>
              </li>
              <li>
                <a href="/unsubscribe">Unsubscribe</a>
              </li>

            </ul>
          </div>

          <div>
            <p className="label">Legal & feeds</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a href="/privacy">Privacy</a>
              </li>
              <li>
                <a href="/terms">Terms</a>
              </li>
              <li>
                <a href="/sitemap.xml">Sitemap</a>
              </li>
              <li>
                <a href="/rss/news.xml">RSS: News</a>
              </li>
              <li>
                <a href="/rss/events.xml">RSS: Events</a>
              </li>
              <li>
                <a href="/rss/federal.xml">RSS: Federal</a>
              </li>
              <li>
                <a href="/podcast">Podcast</a>
              </li>
              <li>
                <a href="/podcast.rss">Daily Podcast</a>
              </li>
              <li>
                <a href="/search">Search</a>
              </li>
              <li>
                <a href="/api/articles.json">Developer API</a>
              </li>


            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[var(--hairline)] pt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="meta">
            &copy; {new Date().getFullYear()} {siteName()}. All rights reserved. Published in{" "}
            {cityName()}{isCityAustralian() ? ", Australia" : ""}.
          </p>
          <div className="flex items-center gap-3">
            {social?.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="meta hover:text-[var(--ink-red)]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.044 1.613.115v3.146c-.427-.044-.72-.065-1.088-.065-1.545 0-2.143.584-2.143 2.101v2.261h3.07l-.527 3.667h-2.543v8.11C19.395 23.025 24 18.07 24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.618Z" />
                </svg>
              </a>
            )}
            {social?.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="meta hover:text-[var(--ink-red)]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            )}
            {social?.twitter && (
              <a
                href={social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="meta hover:text-[var(--ink-red)]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
            <a
              href="/admin/login"
              className="meta uppercase tracking-widest ml-3 px-2 py-1 border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--surface)]"
            >
              Admin login
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
