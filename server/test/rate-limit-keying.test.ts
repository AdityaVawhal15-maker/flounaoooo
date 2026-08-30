import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { requestKey } from "../src/middleware/rateLimit.js";

// Who a rate-limited request counts against.
//
// This is a market decision as much as a technical one. Indian mobile carriers
// run carrier-grade NAT, so thousands of subscribers on Jio or Airtel share one
// public address. Keying limits purely on address means one bucket has to hold a
// crowd, and there is no number that is both large enough for them and small
// enough to stop an attacker — so the people throttled are ordinary customers on
// mobile data, which is nearly all of them.
//
// A signed-in request therefore counts against its session, and only anonymous
// traffic falls back to its address.

function req(over: Partial<Request> & { cookies?: Record<string, string> }): Request {
  return { ip: "203.0.113.7", cookies: {}, ...over } as unknown as Request;
}

describe("rate limits are keyed by session, not by address", () => {
  it("two people behind one carrier address get separate buckets", () => {
    const sharedIp = "49.207.0.42"; // one CGNAT address
    const a = requestKey(req({ ip: sharedIp, cookies: { access_token: "token-for-asha" } }));
    const b = requestKey(req({ ip: sharedIp, cookies: { access_token: "token-for-bhavna" } }));
    expect(a).not.toBe(b);
  });

  it("one person keeps one bucket as their address changes", () => {
    // Walking from mobile data onto office wifi must not hand them a fresh
    // allowance, or the limit means nothing to anyone who can change network.
    const token = "the-same-session";
    const onMobile = requestKey(req({ ip: "49.207.0.42", cookies: { access_token: token } }));
    const onWifi = requestKey(req({ ip: "103.21.244.9", cookies: { access_token: token } }));
    expect(onMobile).toBe(onWifi);
  });

  it("never holds any part of a session token in limiter memory", () => {
    const token = "super-secret-session-token-value";
    const key = requestKey(req({ cookies: { access_token: token } }));
    expect(key).not.toContain(token);
    expect(key).not.toContain("secret");
    expect(key.startsWith("s:")).toBe(true);
  });

  it("falls back to the address when there is no session", () => {
    const key = requestKey(req({ ip: "203.0.113.7" }));
    expect(key).toBe("i:203.0.113.7");
  });

  it("buckets IPv6 by prefix, not by exact address", () => {
    // A client is routinely handed a whole /64 and could otherwise walk through
    // it to reset its own bucket at will.
    const first = requestKey(req({ ip: "2401:4900:1c00:1234:aaaa:bbbb:cccc:0001" }));
    const second = requestKey(req({ ip: "2401:4900:1c00:1234:dddd:eeee:ffff:9999" }));
    expect(first).toBe(second);

    // A genuinely different prefix is still a different bucket.
    const elsewhere = requestKey(req({ ip: "2401:4900:1c00:9999:aaaa:bbbb:cccc:0001" }));
    expect(elsewhere).not.toBe(first);
  });

  it("keeps sessions and addresses in separate namespaces", () => {
    // Without the prefixes, a crafted token could be made to collide with an
    // address key and share — or exhaust — someone else's allowance.
    const session = requestKey(req({ cookies: { access_token: "x" } }));
    const address = requestKey(req({ ip: "203.0.113.7" }));
    expect(session.startsWith("s:")).toBe(true);
    expect(address.startsWith("i:")).toBe(true);
  });

  it("survives a request with no address at all", () => {
    expect(() => requestKey(req({ ip: undefined }))).not.toThrow();
  });
});
