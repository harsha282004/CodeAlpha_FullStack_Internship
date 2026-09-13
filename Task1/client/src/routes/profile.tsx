import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout, LoadingState, PageHeader } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/guards";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — ShopSphere" },
      { name: "description", content: "Manage your ShopSphere account details and orders." },
      { property: "og:title", content: "Your Profile — ShopSphere" },
      { property: "og:description", content: "Account details and quick actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading, ready } = useRequireAuth();
  const { signOut } = useStore();
  const navigate = useNavigate();

  if (isLoading || !ready || !user) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="Profile" subtitle="Your account details and shortcuts." />
      <div className="grid gap-6 pb-16 lg:grid-cols-[1fr_320px]">
        <dl className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <dt className="text-xs font-bold uppercase text-muted-foreground">Name</dt>
            <dd className="mt-1 break-words text-lg font-bold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-muted-foreground">Email</dt>
            <dd className="mt-1 break-all text-lg font-bold">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-muted-foreground">Role</dt>
            <dd className="mt-1">
              <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold capitalize text-primary">{user.role}</span>
            </dd>
          </div>
        </dl>
        <aside className="h-fit rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-2xl uppercase">Actions</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild>
              <Link to="/orders">View Orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/products">Continue Shopping</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                void navigate({ to: "/", replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
