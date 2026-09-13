import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminLayout, AdminPanel } from "@/components/admin";
import { LoadingState, ErrorState } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/store";
import { productsApi, ApiError, type Product } from "@/lib/api";
import { useRequireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/admin/products")({
  validateSearch: z.object({ action: z.enum(["new"]).optional() }),
  head: () => ({
    meta: [
      { title: "Manage Products — ShopSphere Admin" },
      { name: "description", content: "Create, edit and remove products in the ShopSphere catalogue." },
      { property: "og:title", content: "Manage Products — ShopSphere Admin" },
      { property: "og:description", content: "Catalogue management tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminProducts,
});

const categories = ["All", "Apparel", "Electronics", "Home", "Accessories"];
const emptyForm = { name: "", slug: "", description: "", price: "", imageUrl: "", category: "Apparel", stock: "" };
const PAGE_SIZE = 5;

function AdminProducts() {
  const { ready, isLoading: authLoading } = useRequireAdmin();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-products", { query, category, page }],
    queryFn: () => productsApi.list({ search: query || undefined, category: category === "All" ? undefined : category, page, limit: PAGE_SIZE }),
    enabled: ready,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors([]);
    setFormApiError(null);
    setFormOpen(true);
  };

  // Lets the dashboard's "Add Product" quick action jump straight into the create form.
  useEffect(() => {
    if (search.action === "new") {
      openCreate();
      void navigate({ search: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.action]);

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl,
      category: product.category,
      stock: String(product.stock),
    });
    setErrors([]);
    setFormApiError(null);
    setFormOpen(true);
  };

  function invalidateProductQueries() {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      toast.success("Product created");
      invalidateProductQueries();
      setFormOpen(false);
    },
    onError: (caught: unknown) => {
      setFormApiError(caught instanceof Error ? caught.message : "Could not create the product.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Product, "id" | "createdAt">> }) => productsApi.update(id, payload),
    onSuccess: () => {
      toast.success("Product updated");
      invalidateProductQueries();
      setFormOpen(false);
    },
    onError: (caught: unknown) => {
      setFormApiError(caught instanceof Error ? caught.message : "Could not update the product.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success("Product deleted");
      invalidateProductQueries();
      setDeleting(null);
    },
    onError: (caught: unknown) => {
      // Surfaces the backend's specific message (e.g. "referenced by existing orders")
      // instead of a generic failure toast.
      toast.error(caught instanceof Error ? caught.message : "Could not delete the product.");
      setDeleting(null);
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const found: string[] = [];
    if (form.name.trim().length < 2) found.push("Name is required.");
    if (!/^[a-z0-9-]+$/.test(form.slug)) found.push("Slug must use lowercase letters, numbers and hyphens.");
    if (!form.description.trim()) found.push("Description is required.");
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) found.push("Price must be greater than zero.");
    else if (Math.abs(Math.round(price * 100) - price * 100) >= 1e-6) found.push("Price can have at most 2 decimal places.");
    if (!form.imageUrl.trim()) found.push("Image URL is required.");
    const stock = Number(form.stock);
    if (form.stock === "" || !Number.isInteger(stock) || stock < 0) found.push("Stock must be zero or more.");
    setErrors(found);
    setFormApiError(null);
    if (found.length) return;

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim(),
      price,
      imageUrl: form.imageUrl.trim(),
      category: form.category,
      stock,
    };

    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  if (authLoading || !ready) {
    return (
      <AdminLayout title="Products">
        <LoadingState />
      </AdminLayout>
    );
  }

  const products = data?.products ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <AdminLayout
      title="Products"
      subtitle="Search, filter and maintain the catalogue."
      action={
        <Button variant="secondary" onClick={openCreate}>
          Add Product
        </Button>
      }
    >
      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search products..."
            className="h-11 border-background/20 bg-background/10 text-background placeholder:text-background/40"
            aria-label="Search products"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "secondary" : "ghost"}
                className={category === cat ? "" : "text-background/70 hover:bg-background/10 hover:text-background"}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState retry={() => void refetch()} />}

        {!isLoading && !isError && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-background/50">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Image
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Price
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Stock
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Created
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-background/10">
                    <td className="py-3 pr-4">
                      <img src={product.imageUrl} alt={product.name} loading="lazy" width={1024} height={1024} className="size-10 rounded-lg object-cover" />
                    </td>
                    <td className="py-3 pr-4 font-semibold">{product.name}</td>
                    <td className="py-3 pr-4 text-background/60">{product.category}</td>
                    <td className="py-3 pr-4">{money(product.price)}</td>
                    <td className="py-3 pr-4">{product.stock}</td>
                    <td className="py-3 pr-4 text-background/60">{new Date(product.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleting(product)} aria-label={`Delete ${product.name}`}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <p className="py-10 text-center text-background/60">No products match your filters.</p>}
          </div>
        )}

        {totalPages > 1 && !isLoading && !isError && (
          <nav aria-label="Pagination" className="mt-5 flex justify-center gap-2">
            <Button variant="ghost" className="text-background/70 hover:bg-background/10 hover:text-background" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => (
              <Button
                key={n}
                variant={page === n ? "secondary" : "ghost"}
                className={page === n ? "" : "text-background/70 hover:bg-background/10 hover:text-background"}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button variant="ghost" className="text-background/70 hover:bg-background/10 hover:text-background" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        )}
      </AdminPanel>

      <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>All fields apply to the catalogue immediately after saving.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label htmlFor="p-slug">Slug</Label>
                <Input id="p-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label htmlFor="p-price">Price</Label>
                <Input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label htmlFor="p-stock">Stock</Label>
                <Input id="p-stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label htmlFor="p-category">Category</Label>
                <select
                  id="p-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {categories.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="p-image">Image URL</Label>
                <Input id="p-image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="mt-1.5 h-11" />
              </div>
            </div>
            <div>
              <Label htmlFor="p-description">Description</Label>
              <Textarea id="p-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={3} />
            </div>
            {(errors.length > 0 || formApiError) && (
              <ul role="alert" className="space-y-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
                {formApiError && <li>{formApiError}</li>}
              </ul>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>
              {deleting ? `"${deleting.name}" will be permanently deleted. This cannot be undone.` : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
