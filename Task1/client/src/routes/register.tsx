import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — ShopSphere" },
      { name: "description", content: "Create a ShopSphere account to shop and track your orders." },
      { property: "og:title", content: "Create Account — ShopSphere" },
      { property: "og:description", content: "Join ShopSphere in under a minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (form.name.trim().length < 2) return setError("Please enter your full name.");
    if (!form.email.includes("@")) return setError("Please enter a valid email address.");
    if (form.password.length < 8) return setError("Passwords must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setError(null);
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created");
      void navigate({ to: "/products" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 sm:p-9">
        <Brand />
        <h1 className="mt-6 font-display text-4xl uppercase">Create Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Shop faster and keep every order in one place.</p>
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={update("name")} className="mt-1.5 h-11" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={update("email")} className="mt-1.5 h-11" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={update("password")} className="mt-1.5 h-11" required />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" value={form.confirm} onChange={update("confirm")} className="mt-1.5 h-11" required />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <p className="mt-6 text-sm font-semibold">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
