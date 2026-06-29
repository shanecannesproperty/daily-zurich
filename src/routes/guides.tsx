import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout shell for the /guides/* subtree.
// guides.index.tsx renders the guide list; guides.$slug.tsx renders individual guides.
// /guide/$slug (no 's') is a separate static-config hub system.
export const Route = createFileRoute("/guides")({
  component: () => <Outlet />,
});
