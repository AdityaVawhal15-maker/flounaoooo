// The age gate and the consent record.
//
// Both exist because a document promises them: Terms 3.1 and Privacy 8.1 set a
// floor of 18, and DPDP s.6 requires consent we can demonstrate afterwards.
// A promise nothing tests is a promise that quietly stops being true, so these
// are written as attempts to get past the gate rather than as a demonstration
// that the happy path works.

import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { meetsMinimumAge, POLICY_VERSION } from "../src/lib/policy.js";

const ok = (extra: Record<string, unknown> = {}) => ({
  name: "Age Test",
  password: "password123",
  dateOfBirth: "1995-04-12",
  acceptTerms: true,
  ...extra,
});

describe("minimum age arithmetic", () => {
  // Fixed "now" so these do not start failing on someone's birthday.
  const now = new Date("2026-08-31T00:00:00Z");

  it("accepts an adult and rejects a child", () => {
    expect(meetsMinimumAge("1995-04-12", now)).toBe(true);
    expect(meetsMinimumAge("2015-04-12", now)).toBe(false);
  });

  it("is exact on the eighteenth birthday, and the day before", () => {
    expect(meetsMinimumAge("2008-08-31", now)).toBe(true);
    expect(meetsMinimumAge("2008-09-01", now)).toBe(false);
  });

  it("handles 29 February without dividing by an average year", () => {
    // Born on a leap day, turning 18 in a non-leap year. Anyone computing this
    // as elapsed-days over 365.25 gets this one wrong by a day.
    expect(meetsMinimumAge("2008-02-29", new Date("2026-03-01T00:00:00Z"))).toBe(true);
    expect(meetsMinimumAge("2008-02-29", new Date("2026-02-27T00:00:00Z"))).toBe(false);
  });

  it("treats anything it cannot read as not an adult", () => {
    // A date that rolls over silently in most parsers: 30 February becomes
    // 2 March, which would otherwise let a bad string through as valid.
    expect(meetsMinimumAge("2011-02-30", now)).toBe(false);
    expect(meetsMinimumAge("", now)).toBe(false);
    expect(meetsMinimumAge("not-a-date", now)).toBe(false);
    expect(meetsMinimumAge("12-04-1995", now)).toBe(false);
    // The future is not eighteen years ago.
    expect(meetsMinimumAge("2030-01-01", now)).toBe(false);
  });
});

describe("sign-up enforces the published minimum age", () => {
  it("refuses an account for someone under 18", async () => {
    const email = `minor${Date.now()}@test.dev`;
    const res = await request(app)
      .post("/api/auth/signup")
      .send(ok({ email, dateOfBirth: "2015-06-01" }))
      .expect(403);
    expect(res.body.error ?? res.body.message).toMatch(/18/);

    // Nothing was created. Rejecting the request but keeping the row would
    // leave us holding a child's data, which is the thing being prevented.
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });

  it("cannot be bypassed by omitting the date entirely", async () => {
    const email = `nodob${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "No DOB", email, password: "password123", acceptTerms: true })
      .expect(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("refuses the day before the eighteenth birthday", async () => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - 18);
    d.setUTCDate(d.getUTCDate() + 1); // one day short
    const email = `almost${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send(ok({ email, dateOfBirth: d.toISOString().slice(0, 10) }))
      .expect(403);
  });
});

describe("sign-up records consent that can be produced later", () => {
  it("requires the acceptance to be sent, and to be true", async () => {
    const a = `noaccept${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "X", email: a, password: "password123", dateOfBirth: "1995-04-12" })
      .expect(400);

    // An explicit refusal is not an acceptance. A schema that defaulted this
    // to true would record an agreement the person actively declined.
    const b = `refused${Date.now()}@test.dev`;
    await request(app)
      .post("/api/auth/signup")
      .send(ok({ email: b, acceptTerms: false }))
      .expect(400);

    expect(await prisma.user.findUnique({ where: { email: a } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: b } })).toBeNull();
  });

  it("stamps the account and writes a log entry naming the version", async () => {
    const email = `consent${Date.now()}@test.dev`;
    await request(app).post("/api/auth/signup").send(ok({ email })).expect(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);
    expect(user.termsVersion).toBe(POLICY_VERSION);
    expect(user.dateOfBirth).toBe("1995-04-12");

    const records = await prisma.consentRecord.findMany({
      where: { userId: user.id, kind: "terms" },
    });
    expect(records).toHaveLength(1);
    expect(records[0].granted).toBe(true);
    // Which text they agreed to is the part that makes this evidence. A row
    // saying only "they consented" cannot answer "to what".
    expect(records[0].version).toBe(POLICY_VERSION);
  });

  it("does not accept a forged consent timestamp from the client", async () => {
    const email = `forge${Date.now()}@test.dev`;
    // The schema is strict, so an unknown field is refused outright rather
    // than being ignored and leaving the caller believing it was honoured.
    await request(app)
      .post("/api/auth/signup")
      .send(ok({ email, termsAcceptedAt: "2020-01-01T00:00:00Z" }))
      .expect(400);
  });
});
