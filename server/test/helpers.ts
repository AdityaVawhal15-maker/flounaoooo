import request from "supertest";
import { createApp } from "../src/app.js";
import { otpOutbox } from "../src/lib/mailer.js";
import { prisma } from "../src/lib/prisma.js";

export const app = createApp();

export function lastOtpFor(email: string): string {
  const hit = [...otpOutbox].reverse().find((o) => o.to === email);
  if (!hit) throw new Error(`No OTP captured for ${email}`);
  return hit.code;
}

// Promotes a signed-up user to an operator role and completes the console 2FA
// flow (password → emailed OTP), returning a step-up-verified agent that can
// reach the back-office. The default sign-up password is "password123".
export async function consoleAgent(role: "developer" | "admin" | "super_admin") {
  const { agent, email } = await authedAgent();
  await prisma.user.update({ where: { email }, data: { role } });
  await stepUp(agent, email);
  return { agent, email };
}

// Runs the console password + OTP step-up for an already-promoted account on the
// given agent, leaving it with a verified operator session.
export async function stepUp(
  agent: ReturnType<typeof request.agent>,
  email: string,
  password = "password123",
) {
  await agent.post("/api/auth/console/login").send({ email, password }).expect(200);
  await agent
    .post("/api/auth/console/verify")
    .send({ email, code: lastOtpFor(email) })
    .expect(200);
}

let counter = 0;

// Signs up + verifies a fresh user; returns the auth cookies. A default
// delivery address is seeded because food orders require one — this mirrors a
// real user who has completed setup. Pass `withAddress: false` to test the
// no-address path.
export async function authedAgent({ withAddress = true } = {}) {
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
  if (withAddress) {
    await agent
      .post("/api/users/addresses")
      .send({
        label: "Home",
        line1: "Flat 12",
        line2: "MG Road",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500081",
        isDefault: true,
      })
      .expect(201);
  }
  return { agent, email };
}
