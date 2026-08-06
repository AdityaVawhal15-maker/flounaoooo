import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, authedAgent, lastOtpFor } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

describe("auth", () => {
  it("rejects a wrong OTP and accepts the right one", async () => {
    const email = `otp-${Date.now()}@test.dev`;
    const agent = request.agent(app);

    await agent
      .post("/api/auth/signup")
      .send({ name: "Otp User", email, password: "password123" })
      .expect(201);

    await agent
      .post("/api/auth/verify-email")
      .send({ email, code: "000000" })
      .expect(400);

    const res = await agent
      .post("/api/auth/verify-email")
      .send({ email, code: lastOtpFor(email) })
      .expect(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.emailVerified).toBe(true);

    // Session cookie works
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.user.email).toBe(email);
  });

  it("never stores or accepts weak/invalid input", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "X", email: "not-an-email", password: "short" })
      .expect(400);
  });

  it("returns the same generic error for wrong password and unknown email", async () => {
    const { email } = await authedAgent();
    const wrongPass = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" })
      .expect(401);
    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@test.dev", password: "whatever123" })
      .expect(401);
    expect(wrongPass.body.error).toBe(unknown.body.error); // no enumeration
  });

  it("locks an account after repeated failed logins, and reset clears it (M3)", async () => {
    const { email } = await authedAgent();
    // 10 wrong passwords trip the lockout.
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email, password: "definitely-wrong" })
        .expect(401);
    }
    // Now even the CORRECT password is locked out (429).
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password123" })
      .expect(429);

    // A password reset clears the lock and restores access.
    await request(app).post("/api/auth/forgot").send({ email }).expect(200);
    await request(app)
      .post("/api/auth/reset")
      .send({ email, code: lastOtpFor(email), password: "recovered-pass1" })
      .expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "recovered-pass1" })
      .expect(200);
  });

  it("blocks signup reuse of a verified email", async () => {
    const { email } = await authedAgent();
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "Imposter", email, password: "password456" })
      .expect(409);
  });

  it("resets a password via emailed code and invalidates the old one", async () => {
    const { email } = await authedAgent();

    await request(app).post("/api/auth/forgot").send({ email }).expect(200);
    await request(app)
      .post("/api/auth/reset")
      .send({ email, code: lastOtpFor(email), password: "brand-new-pass1" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password123" })
      .expect(401); // old password dead
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "brand-new-pass1" })
      .expect(200);
  });

  it("does not reveal account existence on forgot-password", async () => {
    const res = await request(app)
      .post("/api/auth/forgot")
      .send({ email: "nobody-here@test.dev" })
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it("requires auth on protected routes", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).get("/api/orders").expect(401);
    await request(app)
      .post("/api/chat/message")
      .send({ message: "hello" })
      .expect(401);
  });

  it("limits active OTP sends per target", async () => {
    const email = `flood-${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "Flood", email, password: "password123" })
      .expect(201); // send 1
    await request(app).post("/api/auth/resend-otp").send({ email }).expect(200); // 2
    await request(app).post("/api/auth/resend-otp").send({ email }).expect(200); // 3
    // 4th active code is refused
    await request(app).post("/api/auth/resend-otp").send({ email }).expect(429);
  });
});

// The sign-up form asks for mobile number and date of birth. Both used to be
// collected and silently discarded — the account never kept what the user
// typed, while the profile screen claimed the number was saved.
describe("sign-up keeps the optional details it asks for", () => {
  it("stores phone and date of birth", async () => {
    const email = `optional${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Optional Fields",
        email,
        password: "password123",
        phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
        dateOfBirth: "1998-04-21",
      })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.phone).toMatch(/^9\d{9}$/);
    expect(user.dateOfBirth).toBe("1998-04-21");
  });

  it("still works when they're omitted, and rejects a bad phone", async () => {
    const email = `noopt${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "No Optionals", email, password: "password123" })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.phone).toBeNull();
    expect(user.dateOfBirth).toBeNull();

    await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Bad Phone",
        email: `badphone${Date.now()}@test.dev`,
        password: "password123",
        phone: "12345",
      })
      .expect(400);
  });

  it("a phone already taken by someone else doesn't break sign-up", async () => {
    const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
    const first = `dup1${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "First", email: first, password: "password123", phone })
      .expect(201);

    const second = `dup2${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "Second", email: second, password: "password123", phone })
      .expect(201); // succeeds; the duplicate phone is just not attached
    const u = await prisma.user.findUniqueOrThrow({ where: { email: second } });
    expect(u.phone).toBeNull();
  });
});

// The local convenience sign-in accepts a fixed string as proof of identity,
// so its gate has to fail closed. NODE_ENV defaults to "development", meaning
// a deploy that forgets to set it would otherwise expose a password-less way
// into a session — requiring Google to be unconfigured is the second lock.
describe("dev mock Google sign-in is not reachable in a real deployment", () => {
  it("is rejected when a Google client ID is configured", async () => {
    await vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("GOOGLE_CLIENT_ID", "real-client-id.apps.googleusercontent.com");
    try {
      const fresh = await import("./helpers.js");
      const res = await request(fresh.app)
        .post("/api/auth/google")
        .send({ credential: "dev-mock-google" });
      // Must NOT hand back a session: either the gate refuses it outright or
      // it falls through to real Google verification, which this string fails.
      expect(res.status).not.toBe(200);
      expect(res.body.user).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
      await vi.resetModules();
    }
  });

  // The production case can't be exercised here: setting NODE_ENV=production
  // makes the app refuse to boot without production-grade secrets (that guard
  // calls process.exit). That refusal is itself the protection for prod, so
  // the lock that actually matters is the one above — it holds even when
  // NODE_ENV is left at its "development" default.
});
