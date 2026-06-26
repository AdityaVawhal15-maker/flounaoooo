import { env, isProd } from "../config/env.js";

// Error monitoring hook. Today it logs structured errors to the console (and
// would forward to Sentry once SENTRY_DSN + the SDK are added — a drop-in:
// initialise the SDK here and call its capture in `captureError`). Designed to
// be a safe no-op without configuration, so dev and CI are unaffected.

export const monitoringEnabled = Boolean(env.SENTRY_DSN);

export function initMonitoring(): void {
  if (!monitoringEnabled) {
    if (isProd) console.warn("[monitoring] SENTRY_DSN unset — error monitoring is console-only");
    return;
  }
  // TODO(sentry): when @sentry/node is added:
  //   Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
  console.info("[monitoring] error monitoring configured");
}

// Report an unexpected error with optional context (route, userId, etc.).
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  const payload = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...context,
    at: new Date().toISOString(),
  };
  // Always log; forward to Sentry when wired.
  console.error("[error]", JSON.stringify(payload));
  // TODO(sentry): Sentry.captureException(err, { extra: context });
}
