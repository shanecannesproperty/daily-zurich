import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const safe = encodeURIComponent(params.code).slice(0, 64);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie": `daily_ref=${safe}; Path=/; Max-Age=2592000; SameSite=Lax`,
          },
        });
      },
    },
  },
  component: () => null,
});
