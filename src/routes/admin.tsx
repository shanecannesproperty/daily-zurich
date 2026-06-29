import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useAdminSession } from "@/hooks/useAdminSession";
import { siteName } from "@/lib/city";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Admin | ${siteName()}` }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, isAdmin } = useAdminSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (loading) {
    return (
      <div className="container-news py-24 text-center">
        <p className="meta uppercase tracking-widest">Loading</p>
      </div>
    );
  }
  // Only verified admins (has_role('admin')) may see admin content. A signed-in
  // non-admin reader is redirected by the hook; render nothing meanwhile.
  if (!isAdmin && pathname !== "/admin/login") {
    return null;
  }
  return <Outlet />;
}
