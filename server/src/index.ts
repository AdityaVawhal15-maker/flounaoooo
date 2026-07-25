import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { initRealtime } from "./realtime/socket.js";
import { checkPriceAlerts } from "./modules/alerts/alerts.service.js";
import {
  startOutboxWorker,
  runLifecycleSweep,
} from "./modules/notifications/outbox.service.js";
import { sweepPlusMemberships } from "./modules/subscription/subscription.service.js";
import { initMonitoring } from "./lib/monitoring.js";
import { seedDemoCoupons } from "./data/coupons.js";

initMonitoring();
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`radiues-api listening on http://localhost:${env.PORT}`);
});

// Realtime channel for live price-drop alerts.
initRealtime(server);

// Every minute, check active price alerts and notify owners on a match.
const alertLoop = setInterval(async () => {
  try {
    const n = await checkPriceAlerts();
    if (n > 0) console.log(`[alerts] triggered ${n} price alert(s)`);
  } catch (err) {
    console.error("[alerts] check failed:", err);
  }
}, 60_000);

// Demo promo codes, so checkout works out of the box in dev.
void seedDemoCoupons().catch((err) => console.error("[coupons] seed failed:", err));

// Drain the email-notification outbox every 30s.
const stopOutbox = startOutboxWorker();

// Daily sweep: Plus renewal reminders (~3 days out) and expiry emails. Runs
// once on boot (catches anything missed while down) then every 24h. Idempotent.
async function runPlusSweep() {
  try {
    const { reminded, expired } = await sweepPlusMemberships();
    if (reminded || expired)
      console.log(`[plus] reminded ${reminded}, expired ${expired}`);
  } catch (err) {
    console.error("[plus] sweep failed:", err);
  }
}
async function runLifecycle() {
  try {
    const { onboarding, winBack, plusValue } = await runLifecycleSweep();
    if (onboarding || winBack || plusValue)
      console.log(
        `[lifecycle] onboarding ${onboarding}, win-back ${winBack}, plus-value ${plusValue}`,
      );
  } catch (err) {
    console.error("[lifecycle] sweep failed:", err);
  }
}
void runPlusSweep();
void runLifecycle();
const plusSweep = setInterval(runPlusSweep, 24 * 60 * 60_000);
const lifecycleSweep = setInterval(runLifecycle, 24 * 60 * 60_000);

// Hourly housekeeping: expired OTP codes and dead refresh tokens never pile up.
const cleanup = setInterval(
  async () => {
    try {
      const dayAgo = new Date(Date.now() - 86_400_000);
      await prisma.otpCode.deleteMany({
        where: { OR: [{ expiresAt: { lt: dayAgo } }, { consumedAt: { lt: dayAgo } }] },
      });
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: dayAgo } }],
        },
      });
    } catch (err) {
      console.error("[cleanup] failed:", err);
    }
  },
  60 * 60_000,
);

// Graceful shutdown: finish in-flight requests, close DB, then exit.
async function shutdown(signal: string) {
  console.log(`[shutdown] ${signal} received`);
  clearInterval(cleanup);
  clearInterval(alertLoop);
  clearInterval(plusSweep);
  clearInterval(lifecycleSweep);
  stopOutbox();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Hard exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
