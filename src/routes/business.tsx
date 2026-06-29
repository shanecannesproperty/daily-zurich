import { createFileRoute, redirect } from "@tanstack/react-router";

// The Business section has been merged into Finance. Permanently redirect
// the legacy /business URL (and any ?page=… search) to /finance so inbound
// links and indexed pages are preserved.
export const Route = createFileRoute("/business")({
  beforeLoad: () => {
    throw redirect({ to: "/finance", search: true, statusCode: 301 });
  },
});
