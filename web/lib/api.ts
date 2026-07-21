// Thin client for the Radiues API. All authenticated requests rely on
// httpOnly cookies (credentials: "include") — tokens are never stored in JS.
// NEXT_PUBLIC_API_URL="/" means same-origin: the host proxies /api/* to the
// API service (see next.config.ts rewrites) so cookies stay first-party.
const configured = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_URL = configured === "/" ? "" : configured.replace(/\/$/, "");

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
    // Server-provided error code (e.g. "step_up_required"), when present.
    public code?: string,
  ) {
    super(message);
  }
}

// One refresh at a time — parallel 401s share the same attempt instead of
// racing the rotating refresh token (which would log the user out).
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function rawFetch(path: string, options: RequestInit & { json?: unknown }) {
  const { json, headers, ...rest } = options;
  return fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  let res = await rawFetch(path, options);

  // Access token expired mid-session: refresh once and retry transparently.
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    if (await tryRefresh()) {
      res = await rawFetch(path, options);
    }
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`,
      (data as { details?: unknown } | null)?.details,
      (data as { code?: string } | null)?.code,
    );
  }
  return data as T;
}
