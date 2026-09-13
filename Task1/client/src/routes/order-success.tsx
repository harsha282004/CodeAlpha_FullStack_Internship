import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { z } from "zod";
import { Layout } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/store";

export const Route = createFileRoute("/order-success")({
  validateSearch: z.object({ orderId: z.string().default("SS-00000-AA"), total: z.number().default(0) }),
  head: () => ({
    meta: [
      { title: "Order Placed — ShopSphere" },
      { name: "description", content: "Your ShopSphere order was placed successfully." },
      { property: "og:title", content: "Order Placed — ShopSphere" },
      { property: "og:description", content: "Order confirmation details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const { orderId, total } = Route.useSearch();
  return (
    <Layout>
      <div className="mx-auto max-w-xl py-20 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-4xl uppercase sm:text-5xl">Order placed successfully!</h1>
        <dl className="mt-8 space-y-2 rounded-2xl border border-border bg-card p-6 text-left">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Order ID</dt>
            <dd className="break-all font-bold">{orderId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Final total</dt>
            <dd className="font-bold">{money(total)}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/orders/$id" params={{ id: orderId }}>
              View Order
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/orders">View Order History</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
