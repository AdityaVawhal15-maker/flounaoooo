import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

// What the server does with a request body it will not read.
//
// These used to come back as 500s and were written to monitoring and to the
// developer error log as internal faults. Two things wrong with that: the caller
// was told the server broke when in fact the caller sent too much, and anyone
// could fill the error log — and the ops team's attention — by POSTing rubbish
// at any endpoint.

describe("request body limits", () => {
  it("answers an oversized body with 413, not 500", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("content-type", "application/json")
      .send(JSON.stringify({ name: "A".repeat(200_000) }));

    expect(res.status).toBe(413);
    expect(res.body.error).toBe("That request was too large");
  });

  it("answers malformed JSON with 400, not 500", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("content-type", "application/json")
      .send('{"email": "someone@example.com", "password": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("That request body could not be read");
  });

  it("never names the internal error class in the reply", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("content-type", "application/json")
      .send(JSON.stringify({ name: "A".repeat(200_000) }));

    // The old reply was "PayloadTooLargeError: request entity too large",
    // which tells a caller about our stack rather than about their request.
    expect(JSON.stringify(res.body)).not.toMatch(/Error:|node_modules|body-parser/);
  });

  it("still refuses an oversized body on a route that needs auth", async () => {
    // The size check runs before the route, so the answer is about the body.
    // That is correct and worth pinning: it must not become an auth oracle by
    // answering differently for a real and a made-up route.
    const real = await request(app)
      .patch("/api/users/me")
      .set("content-type", "application/json")
      .send(JSON.stringify({ name: "A".repeat(200_000) }));
    const fake = await request(app)
      .patch("/api/users/does-not-exist")
      .set("content-type", "application/json")
      .send(JSON.stringify({ name: "A".repeat(200_000) }));

    expect(real.status).toBe(413);
    expect(fake.status).toBe(413);
  });

  it("accepts a body inside the limit", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "not-the-password" });
    // Wrong credentials, but the body was read: this is the control that shows
    // the limit is not simply rejecting everything.
    expect([400, 401, 429]).toContain(res.status);
  });
});

describe("write routes refuse fields they do not know", () => {
  it("rejects an attempt to set your own role through the profile", async () => {
    const { agent } = await authedAgent();
    // Nothing was ever written from this field, but the reply was a 200, which
    // tells a prober the field was understood. Silence about an unknown field
    // is how a future column becomes a privilege escalation.
    const res = await agent
      .patch("/api/users/me")
      .send({ name: "Renamed", role: "super_admin" })
      .expect(400);
    expect(res.body.error).toBe("Validation failed");

    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.user.role ?? "user").toBe("user");
    // And the legitimate part of the request did not sneak through either.
    expect(me.body.user.name).not.toBe("Renamed");
  });

  it("still accepts a well-formed profile update", async () => {
    const { agent } = await authedAgent();
    const res = await agent.patch("/api/users/me").send({ name: "Renamed" }).expect(200);
    expect(res.body.user.name).toBe("Renamed");
  });
});
