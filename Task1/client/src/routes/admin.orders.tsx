import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, AdminPanel } from "@/components/admin";
import { LoadingState, ErrorState } from "@/components/shop";
import { StatusBadge, orderStatuses, type OrderStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/store";
import { adminApi, type OrderStatusValue } from "@/lib/api";
import { useRequireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Manage Orders — ShopSphere Admin" },
      { name: "description", content: "Review ShopSphere orders and update their fulfilment status." },
      { property: "og:title", content: "Manage Orders — ShopSphere Admin" },
      { property: "og:description", content: "Order operations and status updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminOrders,
});

const STATUS_TO_LABEL: Record<OrderStatusValue, OrderStatus> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const LABEL_TO_STATUS: Record<OrderStatus, OrderStatusValue> = {
  Pending: "pending",
  Paid: "paid",
  Shipped: "shipped",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

function AdminOrders() {
  const { ready, isLoading: authLoading } = useRequireAdmin();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: adminApi.listOrders,
    enabled: ready,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatusValue }) => adminApi.updateOrderStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSuccess: (_data, variables) => {
      toast.success(`Order status updated to ${STATUS_TO_LABEL[variables.status]}`);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (caught: unknown) => {
      toast.error(caught instanceof Error ? caught.message : "Could not update the order status.");
    },
    onSettled: () => setUpdatingId(null),
  });

  if (authLoading || !ready) {
    return (
      <AdminLayout title="Orders">
        <LoadingState />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders" subtitle="Track fulfilment and update order status.">
      {isLoading && <LoadingState />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {!isLoading && !isError && (orders?.length ?? 0) === 0 && <p className="text-background/60">No orders yet.</p>}
      {!isLoading && !isError && orders && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <AdminPanel key={order.id}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="break-all font-bold">{order.id}</p>
                  <p className="text-sm text-background/60">
                    {order.customer.name} · <span className="break-all">{order.customer.email}</span> ·{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={STATUS_TO_LABEL[order.status]} />
                <p className="font-bold">{money(order.total)}</p>
                <p className="text-sm text-background/60">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
                <select
                  aria-label={`Status for order ${order.id}`}
                  value={STATUS_TO_LABEL[order.status]}
                  disabled={updatingId === order.id}
                  onChange={(e) => statusMutation.mutate({ id: order.id, status: LABEL_TO_STATUS[e.target.value as OrderStatus] })}
                  className="h-10 rounded-md border border-background/20 bg-background/10 px-3 text-sm text-background disabled:opacity-50"
                >
                  {orderStatuses.map((status) => (
                    <option key={status} value={status} className="text-foreground">
                      {status}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  className="text-background/70 hover:bg-background/10 hover:text-background"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  aria-expanded={expanded === order.id}
                >
                  Details <ChevronDown className={expanded === order.id ? "rotate-180 transition" : "transition"} />
                </Button>
              </div>
              {expanded === order.id && (
                <div className="mt-5 grid gap-5 border-t border-background/10 pt-5 lg:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-background/50">Customer &amp; shipping</h3>
                    <p className="mt-2 break-words text-sm">
                      {order.customer.name}
                      <br />
                      {order.customer.email}
                      <br />
                      {order.shippingAddress.fullName}
                      <br />
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                      <br />
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                      <br />
                      {order.shippingAddress.country}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-background/50">Products</h3>
                    <ul className="mt-2 space-y-2 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span className="min-w-0 break-words">
                            {item.name} <span className="text-background/50">× {item.quantity}</span>
                          </span>
                          <span>{money(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 flex justify-between border-t border-background/10 pt-2 font-bold">
                      <span>Total</span>
                      <span>{money(order.total)}</span>
                    </p>
                  </div>
                </div>
              )}
            </AdminPanel>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
