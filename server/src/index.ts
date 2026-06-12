import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`radiues-api listening on http://localhost:${env.PORT}`);
});

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
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Hard exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
