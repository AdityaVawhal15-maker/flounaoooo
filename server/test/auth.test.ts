import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent, lastOtpFor } from "./helpers.js";

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
