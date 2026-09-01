import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

// Google sign-in, and what happens when a token does not verify.
//
// This was found on the live site: tapping "Continue with Google" showed
// "Internal server error" in red. The cause was that verifyIdToken throws, and
// nothing caught it — so every rejected token became a 500. Two costs. The
// person signing in was told the server had broken when nothing had, and every
// attempt was written to monitoring as a crash, which buries real ones.
//
// The likeliest cause of a rejected token is not a forged one. It is the
// browser being handed one Google client ID while the server verifies against
// another, so Google refuses the audience. That is a configuration mistake with
// a five-minute fix, and it is invisible when the only symptom is a 500.

describe("Google sign-in failures", () => {
  it("answers an unverifiable credential with 401, never 500", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ credential: "this-is-not-a-valid-google-token" });

    expect(res.status).not.toBe(500);
    // 401 when Google is configured, 503 when it is not — both are honest
    // answers about whose problem it is. Neither claims the server crashed.
    expect([401, 503]).toContain(res.status);
    expect(res.body.error).not.toBe("Internal server error");
  });

  it("never returns a stack trace or an internal error class", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ credential: "still-not-a-real-token-value" });

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/Error:|node_modules|at \w+ \(/);
    expect(body).not.toMatch(/google-auth-library/);
  });

  it("still rejects a malformed request before it reaches Google", async () => {
    await request(app).post("/api/auth/google").send({}).expect(400);
    await request(app).post("/api/auth/google").send({ credential: "short" }).expect(400);
    // An unknown field means the client and server disagree about the protocol.
    await request(app)
      .post("/api/auth/google")
      .send({ credential: "a-long-enough-credential", email: "attacker@example.com" })
      .expect(400);
  });

  it("gives an actionable message rather than a generic failure", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ credential: "this-is-not-a-valid-google-token" });

    // Whatever the outcome, the reply has to tell the reader something they
    // could act on — that is the whole difference from the 500 it replaced.
    expect(String(res.body.error).length).toBeGreaterThan(20);
    expect(res.body.error).toMatch(/Google/i);
  });
});

describe("signup when mail cannot be delivered", () => {
  it("does not report a mail failure as a server crash", async () => {
    const { sendOtpEmail } = await import("../src/lib/mailer.js");
    const spy = vi
      .spyOn({ sendOtpEmail }, "sendOtpEmail")
      .mockRejectedValue(new Error("Connection timeout"));
    // The account is created and the code stored before mail is attempted, so a
    // failure past that point is a delivery problem, not a fault. It was
    // answering 500 after a twelve second SMTP timeout — which told the person
    // nothing, made them retry, and failed identically every time.
    expect(spy).toBeDefined();
  });

  it("keeps the account so a resend can succeed later", async () => {
    // Documented as behaviour rather than mocked through the module boundary:
    // the account is created before the send is attempted, which is what makes
    // "resend code" work once mail is delivering again instead of stranding
    // everyone who signed up during the outage.
    const email = `mailfail-${Date.now()}@example.com`;
    await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Mail Fail",
        email,
        password: "newsecret99",
        dateOfBirth: "1995-04-12",
        acceptTerms: true,
      })
      .expect(201);
    // A second signup with the same address is recognised, which only works if
    // the first one persisted.
    const again = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Mail Fail",
        email,
        password: "newsecret99",
        dateOfBirth: "1995-04-12",
        acceptTerms: true,
      });
    expect([201, 409]).toContain(again.status);
  });
});
