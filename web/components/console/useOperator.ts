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

// Guards a console page. Uses the step-up-aware /api/console/whoami probe: it
// succeeds only for an operator whose session has cleared 2FA. Anything else —
// not an operator (404), step-up needed (403 step_up_required), or no session —
// sends them to the console login (which runs the password + OTP flow). We need
// the account's name/email too, so we pair it with /api/auth/me.
export function useOperator(accept: Role[] = ["developer", "admin", "super_admin"]) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const deny = () => {
      if (cancelled) return;
      setState({ status: "denied" });
      router.replace("/console/login");
    };

    Promise.all([
      api<{ id: string; role: Role }>("/api/console/whoami"),
      api<{ user: Operator }>("/api/auth/me"),
    ])
      .then(([who, me]) => {
        if (cancelled) return;
        const allowed =
          who.role !== "user" && accept.some((r) => roleSatisfies(who.role, r));
        if (allowed) setState({ status: "ok", operator: { ...me.user, role: who.role } });
        else deny();
      })
      .catch(deny);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
