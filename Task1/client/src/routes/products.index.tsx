import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Layout, PageHeader, ProductCard, SearchField, EmptyState, LoadingState, ErrorState } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { productsApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/products/")({
  validateSearch: z.object({ category: z.string().optional(), search: z.string().optional(), page: z.number().optional() }),
  head: () => ({
    meta: [
      { title: "All Products — ShopSphere" },
      { name: "description", content: "Browse the complete ShopSphere product catalogue." },
      { property: "og:title", content: "All Products — ShopSphere" },
      { property: "og:description", content: "Apparel, electronics, home and accessories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

const PAGE_SIZE = 6;
const CATEGORIES = ["All", "Apparel", "Electronics", "Home", "Accessories"];

function ProductsPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const category = searchParams.category ?? "All";
  const page = searchParams.page ?? 1;
  const [queryInput, setQueryInput] = useState(searchParams.search ?? "");

  // Debounce the search box before it becomes part of the (server-driving) URL state.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (queryInput === (searchParams.search ?? "")) return;
      void navigate({ search: (prev) => ({ ...prev, search: queryInput || undefined, page: undefined }) });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", { search: searchParams.search ?? "", category, page }],
    queryFn: () =>
      productsApi.list({
        search: searchParams.search || undefined,
        category: category === "All" ? undefined : category,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const setCategory = (next: string) => {
    void navigate({ search: (prev) => ({ ...prev, category: next === "All" ? undefined : next, page: undefined }) });
  };

  const setPage = (next: number) => {
    void navigate({ search: (prev) => ({ ...prev, page: next === 1 ? undefined : next }) });
  };

  // Keep the search box in sync when navigation clears the URL's search param
  // (e.g. via the empty-state's "Clear filters" link).
  useEffect(() => {
    if (!searchParams.search) setQueryInput("");
  }, [searchParams.search]);

  const products = data?.products ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <Layout>
      <PageHeader title="All Products" subtitle="Thoughtfully selected essentials for how you live, work and move." />
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <SearchField value={queryInput} onChange={setQueryInput} />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Button key={cat} variant={category === cat ? "default" : "outline"} onClick={() => setCategory(cat)}>
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {isLoading && <LoadingState />}

        {isError && <ErrorState retry={() => void refetch()} />}

        {!isLoading && !isError && products.length === 0 && (
          <EmptyState title="No products found" message="Try a different search or category." action="Clear filters" to="/products" />
        )}

        {!isLoading && !isError && products.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && !isLoading && !isError && (
        <nav aria-label="Pagination" className="mt-10 flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => (
            <Button key={n} variant={page === n ? "default" : "outline"} onClick={() => setPage(n)}>
              {n}
            </Button>
          ))}
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </Layout>
  );
}
