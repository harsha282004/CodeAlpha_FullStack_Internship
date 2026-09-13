import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, AdminPanel } from "@/components/admin";
import { LoadingState, ErrorState } from "@/components/shop";
import { adminApi } from "@/lib/api";
import { useRequireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Registered Users — ShopSphere Admin" },
      { name: "description", content: "View registered ShopSphere customers and their roles." },
      { property: "og:title", content: "Registered Users — ShopSphere Admin" },
      { property: "og:description", content: "Customer directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const { ready, isLoading: authLoading } = useRequireAdmin();
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.listUsers,
    enabled: ready,
  });

  if (authLoading || !ready) {
    return (
      <AdminLayout title="Users">
        <LoadingState />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users" subtitle="Everyone with a ShopSphere account.">
      <AdminPanel>
        {isLoading && <LoadingState />}
        {isError && <ErrorState retry={() => void refetch()} />}
        {!isLoading && !isError && (users?.length ?? 0) === 0 && <p className="py-10 text-center text-background/60">No users yet.</p>}
        {!isLoading && !isError && users && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-background/50">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Role
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-background/10">
                    <td className="py-3 pr-4 font-semibold">{user.name}</td>
                    <td className="py-3 pr-4 break-all text-background/70">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-background/10 px-2.5 py-1 text-xs font-bold uppercase">{user.role}</span>
                    </td>
                    <td className="py-3 text-background/60">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </AdminLayout>
  );
}
