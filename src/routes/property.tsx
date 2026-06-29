import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PropertyHub, propertyQuery } from "@/components/PropertyHub";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  type: z.enum(["sale", "rent", "all"]).default("all"),
});

export const Route = createFileRoute("/property")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page, type: search.type }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(propertyQuery(deps.type, deps.page)),
  head: () => ({
    meta: buildMeta({
      title: `Property | ${siteName()}`,
      description: `${cityName()} property listings for sale and for rent, from ${siteName()}.`,
      path: "/property",
    }),
    links: canonicalLinks("/property"),
  }),
  component: Page,
});

function Page() {
  const { page, type } = Route.useSearch();
  return <PropertyHub type={type} page={page} />;
}
