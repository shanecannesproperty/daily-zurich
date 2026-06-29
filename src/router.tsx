import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen";
import { siteDomain } from "@/lib/city";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const SUPPORT_EMAIL = `support@${siteDomain().replace(/^https?:\/\//, "")}`;
  return (
    <div className="container-news py-24 text-center">
      <p className="kicker">Stop the press</p>
      <h1 className="h1-news mt-3">This view didn&apos;t load</h1>
      <p className="dek mt-3" style={{ fontFamily: "Georgia, serif" }}>
        Something went wrong rendering this section.
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
        <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-ghost">
          Contact support
        </a>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  // Wire TanStack Query dehydration/hydration into the router so loader
  // prefetches survive SSR -> client handoff and useSuspenseQuery doesn't
  // refetch (which caused homepage hydration mismatches).
  return routerWithQueryClient(router, queryClient);
};
