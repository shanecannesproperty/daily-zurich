import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sponsor")({
  loader: () => {
    throw redirect({ to: "/advertise" });
  },
});
