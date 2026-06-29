import { createFileRoute } from "@tanstack/react-router";
import { GuideEditor } from "./admin.guides.new";

export const Route = createFileRoute("/admin/guides/$id")({
  ssr: false,
  component: function EditGuideRoute() {
    const { id } = Route.useParams();
    return <GuideEditor id={id} />;
  },
});
