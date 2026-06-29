import { createFileRoute } from "@tanstack/react-router";
import { ListingEditor } from "./admin.listings.new";

export const Route = createFileRoute("/admin/listings/$id")({
  ssr: false,
  component: function EditListingRoute() {
    const { id } = Route.useParams();
    return <ListingEditor id={id} />;
  },
});
