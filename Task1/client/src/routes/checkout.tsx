import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, Layout, LoadingState, PageHeader } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, useStore } from "@/lib/store";
import { ordersApi, type ShippingAddress } from "@/lib/api";
import { useRequireAuth } from "@/lib/guards";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ShopSphere" },
      { name: "description", content: "Enter shipping details and place your ShopSphere order." },
      { property: "og:title", content: "Checkout — ShopSphere" },
      { property: "og:description", content: "Shipping details and order summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

const fields: { id: keyof ShippingAddress; label: string; required: boolean }[] = [
  { id: "fullName", label: "Full Name", required: true },
  { id: "addressLine1", label: "Address Line 1", required: true },
  { id: "addressLine2", label: "Address Line 2", required: false },
  { id: "city", label: "City", required: true },
  { id: "state", label: "State", required: true },
  { id: "postalCode", label: "Postal Code", required: true },
  { id: "country", label: "Country", required: true },
];

function CheckoutPage() {
  const { ready, isLoading } = useRequireAuth();
  const { cart, clearCart } = useStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (isLoading || !ready) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  if (cart.length === 0) {
    return (
      <Layout>
        <PageHeader title="Checkout" />
        <EmptyState title="Your cart is empty." message="Add a product before checking out." action="Start Shopping" />
      </Layout>
    );
  }

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const shippingAddress: ShippingAddress = {
      fullName: String(form.get("fullName") ?? "").trim(),
      addressLine1: String(form.get("addressLine1") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      state: String(form.get("state") ?? "").trim(),
      postalCode: String(form.get("postalCode") ?? "").trim(),
      country: String(form.get("country") ?? "").trim(),
    };
    const addressLine2 = String(form.get("addressLine2") ?? "").trim();
    if (addressLine2) shippingAddress.addressLine2 = addressLine2;

    setError(null);
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        shippingAddress,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      // Only clear the cart after the backend confirms the order was created.
      clearCart();
      toast.success("Order placed");
      void navigate({ to: "/order-success", search: { orderId: order.id, total: order.total } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Checkout" subtitle="Tell us where to ship, then review your order." />
      <form onSubmit={placeOrder} className="grid gap-6 pb-16 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl uppercase">Shipping Information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id} className={field.id.startsWith("address") ? "sm:col-span-2" : undefined}>
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input id={field.id} name={field.id} required={field.required} autoComplete="off" className="mt-1.5 h-11" />
              </div>
            ))}
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-2xl uppercase">Order Summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span className="min-w-0 break-words">
                  {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold">{money(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{money(total)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold">{money(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Your final total is securely calculated by the server.</p>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
            {submitting ? "Placing Order..." : "Place Order"}
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/cart">Back to Cart</Link>
          </Button>
        </aside>
      </form>
    </Layout>
  );
}
