"use client";

import { useEffect } from "react";

// Last-resort boundary for errors thrown in the root layout itself (where the
// normal error.tsx and app styles/providers aren't available). It must render
// its own <html>/<body>, so styling is inline and self-contained.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff9f6",
          color: "#3d1c00",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "#ffe9db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              fontSize: 30,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ margin: "24px 0 8px", fontSize: 24, fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#8b5e3c" }}>
            The app ran into an unexpected problem. Please reload to continue.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              height: 50,
              width: "100%",
              borderRadius: 999,
              border: "none",
              background: "#3d1c00",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
