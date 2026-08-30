// The consent log.
//
// DPDP s.6 requires consent that is free, specific, informed and, critically,
// demonstrable: if asked, we have to be able to show what a person agreed to
// and when. An account row saying `termsAcceptedAt` answers "did they" but not
// "to what" or "how many times", so the account carries the current state and
// this log carries the history.
//
// Nothing here updates. Withdrawing consent writes a new row with granted set
// to false. A log you can edit is not evidence, and the whole point of this
// table is to be evidence.

import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { POLICY_VERSION } from "../../lib/policy.js";

export type ConsentKind = "terms" | "cookies" | "ai_training" | "marketing";

/** The cookie categories a person can actually choose between. */
export type CookieChoice = {
  analytics: boolean;
  advertising: boolean;
  social: boolean;
  performance: boolean;
};

/**
 * Essential cookies are absent from CookieChoice on purpose.
 *
 * They keep you signed in, and a toggle that cannot be switched off is not a
 * choice, it is a claim of one. The cookie page says plainly that they exist
 * and cannot be disabled instead of rendering a locked switch.
 */
export const COOKIE_CATEGORIES = [
  "analytics",
  "advertising",
  "social",
  "performance",
] as const;

export const REJECT_ALL: CookieChoice = {
  analytics: false,
  advertising: false,
  social: false,
  performance: false,
};

export const ACCEPT_ALL: CookieChoice = {
  analytics: true,
  advertising: true,
  social: true,
  performance: true,
};

/** Where the request came from, for the log. Never used to identify anyone. */
export type ConsentContext = { ip?: string | null; userAgent?: string | null };

/**
 * Records one consent decision.
 *
 * Takes an optional transaction client so consent can be written in the same
 * transaction as the thing it authorises. A sign-up that created the account
 * and then failed to log the consent would leave us holding data we could not
 * show a lawful basis for.
 */
export async function recordConsent(
  userId: string,
  kind: ConsentKind,
  granted: boolean,
  opts: {
    version?: string | null;
    detail?: unknown;
    ctx?: ConsentContext;
    tx?: Prisma.TransactionClient;
  } = {},
): Promise<void> {
  const db = opts.tx ?? prisma;
  await db.consentRecord.create({
    data: {
      userId,
      kind,
      granted,
      version: opts.version ?? null,
      detail: opts.detail === undefined ? null : JSON.stringify(opts.detail),
      // Truncated: a user agent is attacker-controlled and unbounded, and this
      // row is written on a path a signed-out caller can reach.
      ip: opts.ctx?.ip?.slice(0, 64) ?? null,
      userAgent: opts.ctx?.userAgent?.slice(0, 256) ?? null,
    },
  });
}

/** Records acceptance of the current terms, and stamps the account with it. */
export async function acceptTerms(
  userId: string,
  ctx: ConsentContext = {},
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  await db.user.update({
    where: { id: userId },
    data: { termsAcceptedAt: new Date(), termsVersion: POLICY_VERSION },
  });
  await recordConsent(userId, "terms", true, { version: POLICY_VERSION, ctx, tx });
}

/**
 * Whether this account has agreed to the policy set currently published.
 *
 * A user who accepted version 1.0 has not accepted 1.1. Treating an older
 * acceptance as current is exactly the failure the version column exists to
 * prevent, so the comparison is on the version, never on the timestamp.
 */
export function hasCurrentTerms(user: {
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
}): boolean {
  return Boolean(user.termsAcceptedAt) && user.termsVersion === POLICY_VERSION;
}

/** Saves a cookie choice and logs it. Essential is untouched by design. */
export async function saveCookieChoice(
  userId: string,
  choice: CookieChoice,
  ctx: ConsentContext = {},
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      cookieChoiceAt: new Date(),
      cookieAnalytics: choice.analytics,
      cookieAdvertising: choice.advertising,
      cookieSocial: choice.social,
      cookiePerformance: choice.performance,
    },
  });
  await recordConsent(userId, "cookies", Object.values(choice).some(Boolean), {
    version: POLICY_VERSION,
    detail: choice,
    ctx,
  });
}

/**
 * What Flouna actually sets today, as opposed to what the cookie policy
 * reserves the right to set.
 *
 * The published policy describes five categories. The application sets two
 * cookies, `access_token` and `refresh_token`, and both are essential: there
 * is no analytics tag, no advertising pixel and no social embed anywhere in
 * the client. Anyone can confirm that in devtools in under a minute.
 *
 * So the cookie screen reports this list rather than implying the other four
 * categories are in use. The toggles are still real and still honoured, which
 * is what makes them worth having the day one of them is switched on. Saying
 * we track people in ways we do not would be a false notice, and under DPDP an
 * inaccurate notice is itself the violation.
 */
export const COOKIES_IN_USE = [
  {
    name: "access_token",
    category: "essential" as const,
    purpose: "Keeps you signed in. Expires after 15 minutes.",
  },
  {
    name: "refresh_token",
    category: "essential" as const,
    purpose: "Renews your session so you are not signed out mid-order.",
  },
];
