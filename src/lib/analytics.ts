// GA4 Measurement ID resolved per-city from city-config.
// Falls back to VITE_GA4_ID env var, then Canberra's ID as last resort.
import { brandingFor } from "@/lib/city-config";
import { citySlug } from "@/lib/city";

export function getGA4Id(): string {
  try {
    const slug = citySlug();
    const branding = brandingFor(slug);
    if (branding?.ga4Id) return branding.ga4Id;
  } catch {
    // server-side or pre-hydration — fall through
  }
  return (import.meta.env.VITE_GA4_ID as string | undefined) || "G-KKGLW3TERV";
}

// Legacy export kept for any direct imports that read GA4_ID as a constant.
// Use getGA4Id() for runtime-resolved per-city tracking.
export const GA4_ID: string = (import.meta.env.VITE_GA4_ID as string | undefined) || "G-KKGLW3TERV";