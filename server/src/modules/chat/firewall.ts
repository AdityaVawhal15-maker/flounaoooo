// Layer 3 of the LLM firewall: cheap input checks that run BEFORE any
// model call — obvious junk never costs an API request.

const MAX_MESSAGE_LENGTH = 500;

// Common prompt-injection phrasings. Matching one doesn't block the request —
// the message is flagged so it's routed straight to out_of_scope.
const INJECTION_PATTERNS = [
  /ignore (all |your |previous |prior )*(instructions|rules|prompt)/i,
  /you are now\b/i,
  /act as\b/i,
  /pretend (to be|you are)/i,
  /system prompt/i,
  /jailbreak/i,
  /developer mode/i,
  /\bDAN\b/,
];

export type FirewallVerdict =
  | { ok: true }
  | { ok: false; reason: "too_long" | "empty" | "injection" };

export function checkMessage(raw: string): FirewallVerdict {
  const message = raw.trim();
  if (!message) return { ok: false, reason: "empty" };
  if (message.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "too_long" };
  if (INJECTION_PATTERNS.some((p) => p.test(message))) {
    return { ok: false, reason: "injection" };
  }
  return { ok: true };
}

export const FIREWALL_REPLIES: Record<
  Exclude<FirewallVerdict, { ok: true }>["reason"],
  string
> = {
  empty: "Type what you'd like — food or a ride?",
  too_long: "That's a bit long for me — try a short request like \"biryani under ₹300\".",
  injection: "I can help you order food, book rides, or shop — what would you like?",
};
