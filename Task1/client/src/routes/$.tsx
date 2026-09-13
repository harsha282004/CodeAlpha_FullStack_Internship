import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/shop";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page Not Found — ShopSphere" },
      { name: "description", content: "The ShopSphere page you were looking for does not exist." },
      { property: "og:title", content: "Page Not Found — ShopSphere" },
      { property: "og:description", content: "This page could not be found." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotFound,
});

function NotFound() {
  return (
    <Layout>
      <div className="py-28 text-center">
        <p className="font-display text-7xl text-primary">404</p>
        <h1 className="mt-4 font-display text-4xl uppercase sm:text-5xl">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you’re looking for doesn’t exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/products">Shop Products</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
