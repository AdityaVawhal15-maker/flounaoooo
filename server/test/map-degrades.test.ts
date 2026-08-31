import { describe, expect, it, vi, afterEach } from "vitest";
import { authedAgent } from "./helpers.js";

// The product has to work without third-party keys, and "without" includes a
// network that accepts the request and then dies. The fallback used to be
// reached only when the map service answered badly, never when the call threw,
// so a blocked or throttled connection returned a 500 and took ride booking
// down with it. That is the shape of a conference wifi.

afterEach(() => vi.unstubAllGlobals());

describe("map lookups on a hostile network", () => {
  it("still returns places when the geocoder cannot be reached", async () => {
    const { agent } = await authedAgent();
    vi.stubGlobal("fetch", () => Promise.reject(new Error("getaddrinfo ENOTFOUND")));

    const res = await agent.get("/api/rides/geocode?q=Gachibowli").expect(200);
    expect(Array.isArray(res.body.places)).toBe(true);
  });

  it("still answers when the geocoder times out", async () => {
    const { agent } = await authedAgent();
    vi.stubGlobal("fetch", () => Promise.reject(new DOMException("aborted", "TimeoutError")));

    await agent.get("/api/rides/geocode?q=Hitech").expect(200);
  });

  it("does not 500 a reverse lookup either", async () => {
    const { agent } = await authedAgent();
    vi.stubGlobal("fetch", () => Promise.reject(new Error("socket hang up")));

    const res = await agent.get("/api/rides/reverse?lat=17.44&lng=78.34");
    expect(res.status).toBeLessThan(500);
  });
});
