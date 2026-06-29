// Vitest setup, run before every test file.
//
// Disable the build-time city pin so the test suite asserts host/ALS resolution
// and the canberra defaults regardless of any VITE_SITE_CITY a remix pins. A
// remix runs this same suite via `bun run test` (invoked by `bun run build`),
// so without this flag a pinned VITE_SITE_CITY would override citySlug() and
// break the ALS and Canberra-default assertions. See src/lib/city.ts.
(globalThis as { __DN_DISABLE_CITY_PIN__?: boolean }).__DN_DISABLE_CITY_PIN__ = true;
