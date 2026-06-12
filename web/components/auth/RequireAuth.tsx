"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

// Client-side gate for signed-in screens. The API independently enforces
// auth on every request — this only handles the redirect UX.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <span className="size-8 animate-spin rounded-full border-2 border-beige border-t-accent" />
      </div>
    );
  }
  return <>{children}</>;
}
