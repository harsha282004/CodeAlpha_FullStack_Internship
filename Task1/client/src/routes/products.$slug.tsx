import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Layout, Quantity, Stock, LoadingState, ErrorState } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { money, useStore } from "@/lib/store";
import { productsApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — ShopSphere` },
      { name: "description", content: "View product details, availability and pricing at ShopSphere." },
      { property: "og:title", content: "Product — ShopSphere" },
      { property: "og:description", content: "Product details and availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { slug } = Route.useParams();
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useStore();

  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productsApi.get(slug),
    retry: false,
  });

  if (isLoading) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (notFound) {
    return (
      <Layout>
        <div className="py-24 text-center">
          <h1 className="font-display text-5xl uppercase">Product not found</h1>
          <p className="mt-3 text-muted-foreground">This product doesn't exist or is no longer available.</p>
          <Button asChild className="mt-6">
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (isError || !product) {
    return (
      <Layout>
        <ErrorState retry={() => void refetch()} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <Button asChild variant="ghost">
          <Link to="/products">
            <ArrowLeft />
            Back to Products
          </Link>
        </Button>
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <img src={product.imageUrl} alt={product.name} width={1024} height={1024} className="aspect-square w-full rounded-2xl object-cover" />
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase text-primary">{product.category}</p>
            <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">{product.name}</h1>
            <p className="mt-4 text-3xl font-bold">{money(product.price)}</p>
            <p className="mt-6 leading-7 text-muted-foreground">{product.description}</p>
            <div className="mt-5">
              <Stock stock={product.stock} />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Quantity value={quantity} max={product.stock || 1} onChange={setQuantity} />
              <Button size="lg" disabled={!product.stock} onClick={() => addToCart(product, quantity)}>
                {product.stock ? "Add to Cart" : "Out of Stock"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
