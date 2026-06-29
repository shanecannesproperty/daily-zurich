import { createFileRoute } from "@tanstack/react-router";
import { EventEditor } from "./admin.events.new";

export const Route = createFileRoute("/admin/events/$id")({
  ssr: false,
  component: function EditEventRoute() {
    const { id } = Route.useParams();
    return <EventEditor id={id} />;
  },
});
