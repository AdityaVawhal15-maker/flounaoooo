import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// Factory for per-route limiters. Limits are relaxed under test so the suite
// isn't throttled by its own rapid requests.
export function makeLimiter(opts: {
  windowMs: number;
  limit: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: env.NODE_ENV === "test" ? 100000 : opts.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(opts.message ? { message: { error: opts.message } } : {}),
  });
}

// Session-lifecycle limiter (refresh/logout): generous but not unbounded.
export const sessionLimiter = makeLimiter({ windowMs: 60_000, limit: 60 });

// Group join-by-code limiter (L5: blocks brute-forcing 6-char codes).
export const joinLimiter = makeLimiter({
  windowMs: 60_000,
  limit: 15,
  message: "Too many attempts — slow down a moment.",
});

// Endpoints that take the account password or an emailed code from an
// already-authenticated caller. A stolen session must not become an offline
// oracle for guessing the password behind it.
export const credentialLimiter = makeLimiter({
  windowMs: 60_000,
  limit: 10,
  message: "Too many attempts — try again in a minute.",
});

// Blocking takes an email address and answers differently for a registered one,
// which makes it an account-existence oracle if it can be called in a loop.
export const lookupLimiter = makeLimiter({
  windowMs: 60_000,
  limit: 20,
  message: "Too many attempts — try again in a minute.",
});
