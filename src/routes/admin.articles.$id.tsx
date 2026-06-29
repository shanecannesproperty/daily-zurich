import { createFileRoute } from "@tanstack/react-router";
import { ArticleEditor } from "./admin.articles.new";

export const Route = createFileRoute("/admin/articles/$id")({
  ssr: false,
  component: function EditArticleRoute() {
    const { id } = Route.useParams();
    return <ArticleEditor id={id} />;
  },
});
