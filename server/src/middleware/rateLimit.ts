import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { env } from "../config/env.js";

/**
 * Who a request counts against.
 *
 * Keying purely on IP is wrong for this market. Indian mobile carriers put
 * enormous numbers of subscribers behind carrier-grade NAT, so thousands of
 * real customers on Jio or Airtel can share one public address. An IP bucket
 * then throttles a crowd for the behaviour of one person in it, and the people
 * who suffer are ordinary users on mobile data — which is nearly all of them.
 *
 * So a request that carries a session counts against that session, and only an
 * anonymous request falls back to its address. The session cookie is used
 * without being verified, because this runs before authentication and its job
 * is fairness rather than security: the per-address ceiling below is what stops
 * someone minting cookies to buy themselves more room.
 */
export function requestKey(req: Request): string {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies
    ?.access_token;
  if (token) {
    // Hashed so no part of a session token is held in limiter memory.
    return "s:" + crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
  }
  // IPv6 is bucketed by /64 rather than by full address, because a single
  // client is routinely handed a whole prefix and could otherwise walk through
  // it to reset its own bucket at will.
  const ip = req.ip ?? "";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return "i:" + parts.slice(0, 4).join(":") + "::/64";
  }
  return "i:" + ip;
}

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
    keyGenerator: requestKey,
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
