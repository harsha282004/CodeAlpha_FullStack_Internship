import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — ShopSphere" },
      { name: "description", content: "Sign in to your ShopSphere account to shop and track orders." },
      { property: "og:title", content: "Sign In — ShopSphere" },
      { property: "og:description", content: "Access your ShopSphere account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!email.includes("@") || password.length < 8) {
      setError("Enter a valid email and a password of at least 8 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back");
      void navigate({ to: "/products" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t sign you in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 sm:p-9">
        <Brand />
        <h1 className="mt-6 font-display text-4xl uppercase">Sign In</h1>
        <p className="mt-2 text-sm text-muted-foreground">Welcome back. Pick up where you left off.</p>
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" required />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 flex justify-between text-sm font-semibold">
          <Link to="/register" className="text-primary hover:underline">
            Create Account
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to Store
          </Link>
        </div>
      </div>
    </main>
  );
}
