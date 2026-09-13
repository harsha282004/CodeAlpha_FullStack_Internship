import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import { Brand } from "@/components/shop";
import { Button } from "@/components/ui/button";

const adminNav = [
  { label: "Dashboard", to: "/admin" },
  { label: "Products", to: "/admin/products" },
  { label: "Orders", to: "/admin/orders" },
  { label: "Users", to: "/admin/users" },
] as const;

export function AdminLayout({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="border-b border-background/10">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-4 px-5 py-4">
          <div className="[&_span]:text-background">
            <Brand />
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {adminNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/admin" }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-background/60 hover:bg-background/10 hover:text-background"
                activeProps={{ className: "bg-background/15 text-background" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button asChild variant="ghost" className="ml-auto text-background hover:bg-background/10 hover:text-background">
            <Link to="/">
              <ArrowLeft />
              Back to Store
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-5 pb-16">
        <div className="flex flex-col gap-4 py-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl uppercase sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-2 text-background/60">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-background/10 bg-background/5 p-5 ${className}`}>{children}</div>;
}
