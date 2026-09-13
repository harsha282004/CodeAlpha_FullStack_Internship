import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Layout, LoadingState, ErrorState } from "@/components/shop";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/store";
import { ordersApi, ApiError, type OrderStatusValue } from "@/lib/api";
import { useRequireAuth } from "@/lib/guards";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order Details — ShopSphere" },
      { name: "description", content: "Review the items, shipping details and total for your ShopSphere order." },
      { property: "og:title", content: "Order Details — ShopSphere" },
      { property: "og:description", content: "Items, shipping and totals for your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderDetail,
});

const STATUS_LABELS: Record<OrderStatusValue, OrderStatus> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderDetail() {
  const { id } = Route.useParams();
  const { ready, isLoading: authLoading } = useRequireAuth();

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id),
    enabled: ready,
    retry: false,
  });

  if (authLoading || !ready || isLoading) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (notFound || (!isLoading && !order)) {
    return (
      <Layout>
        <div className="py-24 text-center">
          <h1 className="font-display text-4xl uppercase">Order not found</h1>
          <p className="mt-3 text-muted-foreground">This order doesn't exist or doesn't belong to your account.</p>
          <Button asChild className="mt-6">
            <Link to="/orders">Back to Orders</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (isError || !order) {
    return (
      <Layout>
        <ErrorState />
      </Layout>
    );
  }

  const address = order.shippingAddress;

  return (
    <Layout>
      <div className="py-8 pb-16">
        <Button asChild variant="ghost">
          <Link to="/orders">
            <ArrowLeft />
            Back to Orders
          </Link>
        </Button>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-all font-display text-4xl uppercase sm:text-5xl">{order.id}</h1>
            <p className="mt-2 text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={STATUS_LABELS[order.status]} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl uppercase">Order Items</h2>
            <ul className="mt-4 space-y-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-4">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} loading="lazy" width={1024} height={1024} className="size-16 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-bold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty {item.quantity} · {money(item.unitPrice)} each
                    </p>
                  </div>
                  <p className="font-bold">{money(item.subtotal)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-between border-t border-border pt-4 text-lg font-bold">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Prices shown here are the prices captured when the order was placed.</p>
          </section>

          <aside className="h-fit rounded-2xl border border-border bg-secondary p-6">
            <h2 className="font-display text-2xl uppercase">Shipping Information</h2>
            <dl className="mt-4 space-y-2 break-words text-sm">
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Full Name</dt>
                <dd className="font-semibold">{address.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Address</dt>
                <dd className="font-semibold">
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">City</dt>
                <dd className="font-semibold">{address.city}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">State</dt>
                <dd className="font-semibold">{address.state}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Postal Code</dt>
                <dd className="font-semibold">{address.postalCode}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Country</dt>
                <dd className="font-semibold">{address.country}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
