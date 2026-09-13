import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { EmptyState, Layout, PageHeader, Quantity } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — ShopSphere" },
      { name: "description", content: "Review the items in your ShopSphere cart before checkout." },
      { property: "og:title", content: "Your Cart — ShopSphere" },
      { property: "og:description", content: "Review your cart and continue to checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Layout>
      <PageHeader title="Your Cart" subtitle="Adjust quantities or remove items before checking out." />
      {cart.length === 0 ? (
        <EmptyState title="Your cart is empty." message="Browse the catalogue and add something you love." action="Start Shopping" />
      ) : (
        <div className="grid gap-6 pb-16 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {cart.map((item) => (
              <li key={item.productId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <img src={item.imageUrl} alt={item.name} loading="lazy" width={1024} height={1024} className="size-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to="/products/$slug" params={{ slug: item.slug }} className="break-words font-bold hover:text-primary">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{money(item.price)} each</p>
                </div>
                <Quantity value={item.quantity} max={item.stock} onChange={(value) => updateQuantity(item.productId, value)} />
                <p className="w-24 text-right font-bold">{money(item.price * item.quantity)}</p>
                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)} aria-label={`Remove ${item.name}`}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-2xl border border-border bg-secondary p-6">
            <h2 className="font-display text-2xl uppercase">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold">{money(subtotal)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild size="lg">
                <Link to="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </Layout>
  );
}
