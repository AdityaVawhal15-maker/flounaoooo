"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export type Role = "user" | "developer" | "admin" | "super_admin";

export type Operator = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Does `role` satisfy `needed`? Mirrors the server: super_admin ⊇ admin;
// developer is a sibling. Used only to render the right UI — the server
// re-authorizes every request regardless of what we show.
export function roleSatisfies(role: Role, needed: Role): boolean {
  if (role === needed) return true;
  if (needed === "admin" && role === "super_admin") return true;
  return false;
}

type State =
  | { status: "loading" }
  | { status: "ok"; operator: Operator }
  | { status: "denied" };

// Guards a console page: loads the current account, and if it isn't an operator
// (or not one of `accept`), sends them to the console login. Returns the
// operator once authorized so the page can render.
export function useOperator(accept: Role[] = ["developer", "admin", "super_admin"]) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api<{ user: Operator }>("/api/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        const allowed =
          user.role !== "user" && accept.some((r) => roleSatisfies(user.role, r));
        if (allowed) setState({ status: "ok", operator: user });
        else {
          setState({ status: "denied" });
          router.replace("/console/login");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "denied" });
        router.replace("/console/login");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
