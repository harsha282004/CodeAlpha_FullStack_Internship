import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, AdminPanel } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/shop";
import { adminApi } from "@/lib/api";
import { useRequireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ShopSphere" },
      { name: "description", content: "Monitor ShopSphere products, orders and customers at a glance." },
      { property: "og:title", content: "Admin Dashboard — ShopSphere" },
      { property: "og:description", content: "Catalogue and order operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

const actions = [
  { label: "Add Product", to: "/admin/products", search: { action: "new" as const } },
  { label: "Manage Products", to: "/admin/products", search: undefined },
  { label: "View Orders", to: "/admin/orders", search: undefined },
  { label: "View Users", to: "/admin/users", search: undefined },
];

function AdminDashboard() {
  const { ready, isLoading: authLoading } = useRequireAdmin();
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminApi.stats,
    enabled: ready,
  });

  if (authLoading || !ready) {
    return (
      <AdminLayout title="Admin Dashboard">
        <LoadingState />
      </AdminLayout>
    );
  }

  const statCards = stats
    ? [
        { label: "Total Products", value: stats.products },
        { label: "Total Orders", value: stats.orders },
        { label: "Pending Orders", value: stats.pendingOrders },
        { label: "Registered Users", value: stats.users },
      ]
    : [];

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Catalogue health, order volume and customer growth.">
      {isLoading && <LoadingState />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {!isLoading && !isError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <AdminPanel key={stat.label}>
              <p className="text-xs font-bold uppercase text-background/50">{stat.label}</p>
              <p className="mt-2 font-display text-4xl">{stat.value}</p>
            </AdminPanel>
          ))}
        </div>
      )}
      <AdminPanel className="mt-6">
        <h2 className="font-display text-2xl uppercase">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.label} asChild variant="secondary">
              <Link to={action.to} search={action.search}>
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </AdminPanel>
    </AdminLayout>
  );
}
