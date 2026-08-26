"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuth, type User } from "./AuthContext";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleButton({
  onError,
  label = "Google",
}: {
  onError: (msg: string) => void;
  /** "Google" beside Apple on login; "Continue with Google" full-width on signup. */
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !ref.current) return;

    const init = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const d = await api<{ user: User }>("/api/auth/google", {
              method: "POST",
              json: { credential },
            });
            setUser(d.user);
            router.push("/home");
          } catch (e) {
            onError(e instanceof Error ? e.message : "Google sign-in failed");
          }
        },
      });
      // Size to the actual slot — a fixed width overflows the half-width grid
      // cell on small screens.
      const slot = ref.current.parentElement?.clientWidth ?? 320;
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        // Google's own copy defaults to "Sign in with Google" — "continue_with"
        // is the one variant that reads the same as the rest of the flow.
        text: "continue_with",
        // 400 is Google's own ceiling. Filling the slot up to it keeps this
        // button the same width as the pills stacked with it — below that cap
        // it visibly under-hangs them.
        width: Math.max(120, Math.min(400, slot)),
      });
      setReady(true);
    };

    if (window.google) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [router, setUser, onError]);

  if (!GOOGLE_CLIENT_ID) {
    const handleDevLogin = async () => {
      if (process.env.NODE_ENV === "production") {
        onError("Google sign-in is not configured yet");
        return;
      }
      try {
        const d = await api<{ user: User }>("/api/auth/google", {
          method: "POST",
          json: { credential: "dev-mock-google" },
        });
        setUser(d.user);
        router.push("/home");
      } catch (e) {
        onError(e instanceof Error ? e.message : "Google sign-in failed");
      }
    };

    return (
      <button
        type="button"
        onClick={handleDevLogin}
        className="flex h-[60px] w-full items-center justify-center gap-3 rounded-pill bg-auth-well text-[17px] font-bold text-auth-ink transition-colors hover:bg-auth-bg [@media(max-width:480px)]:h-11 [@media(max-width:480px)]:text-[15px]"
      >
        <GoogleG size={22} />
        {label}
      </button>
    );
  }

  return (
    // Google's rendered pill is shorter than our own (its own fixed chrome,
    // not ours to restyle) — centering it in a slot matching the other
    // buttons' height keeps the stack's rhythm even instead of this one
    // looking short and adrift.
    <div className={cn("flex h-14 w-full items-center justify-center overflow-hidden", !ready && "opacity-0")}>
      <div ref={ref} />
    </div>
  );
}

// Google's four-colour mark. Inlined rather than pulled from a CDN so the
// button still renders correctly offline, which is how the demo mode runs.
function GoogleG({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
