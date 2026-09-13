import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Client-side route guards. The backend remains the real authorization
// boundary (every protected/admin endpoint re-checks the JWT and role) -
// these hooks only prevent the UI from flashing protected content.

export function useRequireAuth() {
  const { user, authLoading } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/login", replace: true });
    }
  }, [authLoading, user, navigate]);

  return { user, isLoading: authLoading, ready: !authLoading && Boolean(user) };
}

export function useRequireAdmin() {
  const { user, authLoading } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    // role is only ever read from the authenticated /me response, never trusted from elsewhere
    if (user.role !== "admin") {
      void navigate({ to: "/", replace: true });
    }
  }, [authLoading, user, navigate]);

  return { user, isLoading: authLoading, ready: !authLoading && user?.role === "admin" };
}
