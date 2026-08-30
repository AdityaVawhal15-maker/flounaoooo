#!/usr/bin/env node
// Concurrency test against a running API.
//
// Every test in the suite so far is functional or adversarial: one caller, one
// request, does it do the right thing. None of them answer the question that
// decides whether a launch survives its first busy evening — what happens when
// two hundred people do this at once.
//
// It measures latency percentiles rather than an average, because an average
// hides exactly the customers who leave: p99 is the person staring at a spinner
// while everyone around them is served.
//
// Usage:
//   node scripts/loadtest.mjs                 # default profile
//   CONCURRENCY=50 ROUNDS=20 node scripts/loadtest.mjs
//
// It creates its own verified accounts and cleans them up.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BASE = process.env.BASE ?? "http://localhost:4000";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 25);
const ROUNDS = Number(process.env.ROUNDS ?? 8);
const TAG = `loadtest-${Date.now()}`;

const prisma = new PrismaClient();

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function report(name, samples, errors) {
  const ok = samples.filter((s) => s.ok).map((s) => s.ms).sort((a, b) => a - b);
  const failed = samples.length - ok.length;
  const total = samples.reduce((a, s) => Math.max(a, s.end), 0) - Math.min(...samples.map((s) => s.start));
  const rps = total > 0 ? (samples.length / (total / 1000)).toFixed(1) : "-";
  console.log(
    `${name.padEnd(30)} n=${String(samples.length).padStart(4)}  ` +
      `p50 ${String(Math.round(percentile(ok, 50))).padStart(5)}ms  ` +
      `p95 ${String(Math.round(percentile(ok, 95))).padStart(5)}ms  ` +
      `p99 ${String(Math.round(percentile(ok, 99))).padStart(5)}ms  ` +
      `max ${String(Math.round(ok[ok.length - 1] ?? 0)).padStart(5)}ms  ` +
      `${rps}/s  ` +
      (failed ? `FAILED ${failed}` : "ok"),
  );
  if (errors.size) {
    for (const [k, v] of errors) console.log(`    ${v}x  ${k}`);
  }
  return { name, n: samples.length, failed, p50: percentile(ok, 50), p95: percentile(ok, 95), p99: percentile(ok, 99) };
}

/** One signed-in session, created out of band so no OTP is needed. */
async function session(i) {
  const email = `${TAG}-${i}@example.com`;
  // Created with an address, because an order without one is refused by
  // design and a 400 in the results would hide a real failure behind a
  // deliberate one.
  await prisma.user.create({
    data: {
      email,
      name: `Load ${i}`,
      emailVerified: true,
      passwordHash: await bcrypt.hash("newsecret99", 10),
      addresses: {
        create: {
          label: "Home",
          line1: "Flat 4, Load Test Towers",
          city: "Hyderabad",
          state: "Telangana",
          pincode: "500081",
          isDefault: true,
        },
      },
    },
  });
  let jar = "";
  const call = async (path, init = {}) => {
    const start = performance.now();
    try {
      const r = await fetch(BASE + path, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(jar ? { cookie: jar } : {}),
          ...(init.headers || {}),
        },
      });
      const set = r.headers.getSetCookie?.() ?? [];
      if (set.length) {
        const m = new Map(jar.split("; ").filter(Boolean).map((c) => [c.split("=")[0], c]));
        for (const c of set) {
          const f = c.split(";")[0];
          m.set(f.split("=")[0], f);
        }
        jar = [...m.values()].join("; ");
      }
      const body = await r.text();
      const end = performance.now();
      return { ok: r.status < 400, status: r.status, ms: end - start, start, end, body };
    } catch (e) {
      const end = performance.now();
      return { ok: false, status: 0, ms: end - start, start, end, body: String(e) };
    }
  };
  // Signing in fifty times from one address trips the login limiter — which is
  // correct, and would make that limiter the subject of the test instead of the
  // endpoints behind it. The session is minted with the same secret the app
  // signs with, so this measures the API under load, not its front door.
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  const token = jwt.sign({ sub: user.id, role: "user" }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "30m",
  });
  jar = `access_token=${token}`;
  const probe = await call("/api/auth/me");
  return { email, call, loggedIn: probe.ok };
}

async function drive(name, sessions, fn) {
  const samples = [];
  const errors = new Map();
  for (let round = 0; round < ROUNDS; round++) {
    const batch = await Promise.all(
      sessions.map(async (s) => {
        const r = await fn(s, round);
        if (!r.ok) {
          const key = `${r.status} ${String(r.body).slice(0, 70)}`;
          errors.set(key, (errors.get(key) ?? 0) + 1);
        }
        return r;
      }),
    );
    samples.push(...batch);
  }
  return report(name, samples, errors);
}

console.log(`load test — ${CONCURRENCY} concurrent sessions x ${ROUNDS} rounds against ${BASE}\n`);

console.log("creating sessions...");
const sessions = [];
for (let i = 0; i < CONCURRENCY; i++) sessions.push(await session(i));
const signedIn = sessions.filter((s) => s.loggedIn).length;
console.log(`${signedIn}/${CONCURRENCY} signed in\n`);

const results = [];

// ---- reads: the pages every user loads ----
results.push(await drive("GET /api/health", sessions, (s) => s.call("/api/health")));
results.push(await drive("GET /api/auth/me", sessions, (s) => s.call("/api/auth/me")));
results.push(await drive("GET /api/food/search", sessions, (s) => s.call("/api/food/search?q=biryani")));
results.push(await drive("GET /api/orders", sessions, (s) => s.call("/api/orders")));
results.push(await drive("GET /api/users/wallet", sessions, (s) => s.call("/api/users/wallet")));

// ---- writes: where a single-writer database will show itself ----
results.push(
  await drive("POST /api/orders (write)", sessions, (s) =>
    s.call("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        domain: "food",
        items: [{ dishId: "dum-biryani", platform: "ondc", qty: 1 }],
      }),
    }),
  ),
);

results.push(
  await drive("POST /api/groups (write)", sessions, (s) =>
    s.call("/api/groups", { method: "POST", body: JSON.stringify({ platform: "ondc" }) }),
  ),
);

console.log("\ncleaning up...");
await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } });
await prisma.$disconnect();

// ---- the verdict ----
console.log("\n" + "=".repeat(74));
const slow = results.filter((r) => r.p95 > 1000);
const broken = results.filter((r) => r.failed > 0);
if (broken.length) {
  console.log("ENDPOINTS THAT FAILED UNDER LOAD:");
  for (const r of broken) console.log(`  ${r.name}: ${r.failed}/${r.n} failed`);
}
if (slow.length) {
  console.log("ENDPOINTS OVER 1s AT p95:");
  for (const r of slow) console.log(`  ${r.name}: p95 ${Math.round(r.p95)}ms`);
}
if (!broken.length && !slow.length) {
  console.log(`all ${results.length} endpoints stayed under 1s at p95 with no failures`);
}
