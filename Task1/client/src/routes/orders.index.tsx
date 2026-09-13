import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, Layout, LoadingState, PageHeader, ErrorState } from "@/components/shop";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/store";
import { ordersApi, type OrderStatusValue } from "@/lib/api";
import { useRequireAuth } from "@/lib/guards";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your Orders — ShopSphere" },
      { name: "description", content: "Track the status of every ShopSphere order you have placed." },
      { property: "og:title", content: "Your Orders — ShopSphere" },
      { property: "og:description", content: "Order history and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

const STATUS_LABELS: Record<OrderStatusValue, OrderStatus> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrdersPage() {
  const { ready, isLoading: authLoading } = useRequireAuth();
  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
    enabled: ready,
  });

  if (authLoading || !ready) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Your Orders"
        subtitle="Every order, with its current status."
        action={
          <Button asChild variant="outline">
            <Link to="/products">Continue Shopping</Link>
          </Button>
        }
      />
      {isLoading && <LoadingState />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {!isLoading && !isError && (orders?.length ?? 0) === 0 && (
        <EmptyState title="You haven't placed any orders yet." message="Once you order, it will appear here." action="Start Shopping" />
      )}
      {!isLoading && !isError && orders && orders.length > 0 && (
        <ul className="space-y-4 pb-16">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="min-w-0 flex-1">
                <p className="break-all font-bold">{order.id}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={STATUS_LABELS[order.status]} />
              <p className="font-bold">{money(order.total)}</p>
              <Button asChild variant="outline">
                <Link to="/orders/$id" params={{ id: order.id }}>
                  View Order
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
