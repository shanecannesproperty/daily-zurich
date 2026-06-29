import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const INDEXNOW_KEY = "d4c7b8e1f92c3a5e6f7b8c9d0e1fa3b4";

export const Route = createFileRoute("/d4c7b8e1f92c3a5e6f7b8c9d0e1fa3b4.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(INDEXNOW_KEY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
