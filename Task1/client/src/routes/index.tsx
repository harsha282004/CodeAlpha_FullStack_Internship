import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Zap, RefreshCcw, Diamond } from "lucide-react";
import { Layout, ProductCard } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { productsApi } from "@/lib/api";
import { money } from "@/lib/store";
import terra from "@/assets/terra-runner.jpg";
import home from "@/assets/home-goods.jpg";
import apparel from "@/assets/apparel-accessories.jpg";
import headphones from "@/assets/hush-headphones.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopSphere — Modern Commerce, Simple Shopping" },
      { name: "description", content: "Discover apparel, electronics, home goods and accessories with ShopSphere." },
      { property: "og:title", content: "ShopSphere — Modern Commerce" },
      { property: "og:description", content: "A simple, secure and seamless shopping experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const categories = [
  { name: "Apparel", image: apparel },
  { name: "Electronics", image: headphones },
  { name: "Home", image: home },
  { name: "Accessories", image: apparel },
];

const benefits = [
  { icon: Check, title: "Secure Shopping", text: "Protected checkout on every order." },
  { icon: Zap, title: "Easy Checkout", text: "Three steps, no friction, no surprises." },
  { icon: RefreshCcw, title: "Reliable Orders", text: "Clear updates from cart to doorstep." },
  { icon: Diamond, title: "Simple Experience", text: "A store that respects your attention." },
];

function Home() {
  const { data } = useQuery({
    queryKey: ["products", "home-featured"],
    queryFn: () => productsApi.list({ limit: 8 }),
  });
  const products = data?.products ?? [];
  const bestseller = products[0];

  return (
    <Layout>
      <section className="grid items-center gap-8 py-9 lg:grid-cols-12">
        <div className="animate-rise lg:col-span-6">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">New season is live</span>
          <h1 className="mt-5 font-display text-6xl uppercase leading-[.92] sm:text-7xl lg:text-8xl">
            Modern
            <br />
            commerce.
            <br />
            <span className="text-primary">Simple</span>
            <br />
            shopping.
          </h1>
          <p className="mt-5 max-w-md text-muted-foreground">Discover products you love with a simple, secure and seamless shopping experience.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/products">
                Shop Products <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/products" search={{ category: "Apparel" }}>
                Explore Collection
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-6">
          <div>
            <img src={terra} alt="Terra Runner sneakers" width={1024} height={1024} className="aspect-[4/5] w-full rounded-2xl object-cover" />
            {bestseller && (
              <div className="mt-4 rounded-2xl bg-foreground p-4 text-background">
                <p className="text-xs uppercase text-background/60">Bestseller</p>
                <p className="mt-1 font-display text-2xl uppercase">{bestseller.name}</p>
                <div className="flex justify-between text-sm font-bold">
                  <span>{money(bestseller.price)}</span>
                  <span className="text-primary">{bestseller.stock <= 4 ? `Only ${bestseller.stock} left` : "In Stock"}</span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4 pt-8">
            <img src={home} alt="Ceramic vase and bottle" width={1024} height={1024} className="aspect-square w-full rounded-2xl object-cover" />
            <img src={apparel} alt="Knitwear and leather bag" width={1024} height={1024} className="aspect-square w-full rounded-2xl object-cover" />
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-3xl uppercase">Featured Categories</h2>
          <Link to="/products" className="text-sm font-bold text-primary">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.name} to="/products" search={{ category: cat.name }} className="group overflow-hidden rounded-2xl border border-border bg-secondary">
              <img src={cat.image} alt={`${cat.name} products`} loading="lazy" width={1024} height={1024} className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.03]" />
              <div className="flex items-center justify-between p-4">
                <span className="font-display text-xl uppercase">{cat.name}</span>
                <ArrowRight className="size-4 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {products.length > 0 && (
        <section className="py-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-3xl uppercase">Featured Products</h2>
            <Link to="/products" className="text-sm font-bold text-primary">
              All products →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5 py-8 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-secondary p-6 lg:col-span-7">
          <h2 className="font-display text-3xl uppercase">Why ShopSphere?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-border bg-background p-4">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
        {products.length > 0 && (
          <div className="flex flex-col justify-between rounded-2xl bg-foreground p-6 text-background lg:col-span-5">
            <p className="text-xs uppercase text-background/60">Admin · same design system</p>
            <div>
              <h2 className="mt-3 font-display text-3xl uppercase">Catalogue at a glance</h2>
              <div className="mt-4 space-y-2">
                {products.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex justify-between rounded-lg bg-background/5 p-3 text-sm">
                    <span className="font-semibold">{p.name}</span>
                    <span>
                      {p.stock} in stock · {money(p.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary px-7 py-12 md:flex-row md:items-center md:px-14">
        <div>
          <h2 className="font-display text-5xl uppercase leading-none">
            Find something
            <br />
            you'll love.
          </h2>
          <p className="mt-3 font-semibold text-primary-foreground/70">Simple, secure and seamless — from browse to doorstep.</p>
        </div>
        <Button asChild size="lg" variant="secondary">
          <Link to="/products">
            Shop Products <ArrowRight />
          </Link>
        </Button>
      </section>
    </Layout>
  );
}
