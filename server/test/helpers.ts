import request from "supertest";
import { createApp } from "../src/app.js";
import { otpOutbox } from "../src/lib/mailer.js";

export const app = createApp();

export function lastOtpFor(email: string): string {
  const hit = [...otpOutbox].reverse().find((o) => o.to === email);
  if (!hit) throw new Error(`No OTP captured for ${email}`);
  return hit.code;
}

let counter = 0;

// Signs up + verifies a fresh user; returns the auth cookies.
export async function authedAgent() {
  const email = `user${Date.now()}-${counter++}@test.dev`;
  const agent = request.agent(app);
  await agent
    .post("/api/auth/signup")
    .send({ name: "Test User", email, password: "password123" })
    .expect(201);
  await agent
    .post("/api/auth/verify-email")
    .send({ email, code: lastOtpFor(email) })
    .expect(200);
  return { agent, email };
}
