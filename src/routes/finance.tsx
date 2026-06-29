import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CategoryHub, categoryQuery } from "@/components/CategoryHub";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { CATEGORY_LABELS } from "@/lib/schema";
import { cityName, siteName } from "@/lib/city";

const CAT = "finance" as const;
const LABEL = CATEGORY_LABELS[CAT];

const searchSchema = z.object({ page: z.coerce.number().int().min(1).max(500).default(1) });

export const Route = createFileRoute("/finance")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(categoryQuery(CAT, deps.page)),
  head: () => ({
    meta: buildMeta({
      title: `${LABEL} | ${siteName()}`,
      description: `Latest ${LABEL.toLowerCase()} news from ${cityName()}, published by ${siteName()}.`,
      path: `/${CAT}`,
    }),
    links: canonicalLinks(`/${CAT}`),
  }),
  component: Page,
});

function Page() {
  const { page } = Route.useSearch();
  return <CategoryHub category={CAT} page={page} />;
}
