import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { requireRole } from "./middleware/auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { foodRouter } from "./modules/food/food.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { ridesRouter } from "./modules/rides/rides.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { groupsRouter } from "./modules/groups/groups.routes.js";
import { alertsRouter } from "./modules/alerts/alerts.routes.js";
import { shopRouter } from "./modules/shop/shop.routes.js";
import { subscriptionRouter } from "./modules/subscription/subscription.routes.js";
import { devRouter } from "./modules/backoffice/dev.routes.js";
import { adminRouter } from "./modules/backoffice/admin.routes.js";
import { superRouter } from "./modules/backoffice/super.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // behind Cloudflare/nginx in production
  app.use(helmet());

  // Minimal structured request log (skipped in tests) — enough to debug
  // production incidents without a logging dependency.
  if (env.NODE_ENV !== "test") {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        console.log(
          JSON.stringify({
            t: new Date().toISOString(),
            m: req.method,
            p: req.path,
            s: res.statusCode,
            ms: Date.now() - start,
          }),
        );
      });
      next();
    });
  }
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: "100kb",
      // Keep the exact bytes — the Cashfree webhook HMAC is computed over them.
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());

  // Global safety-net limit; sensitive routes (OTP, chat) add stricter ones.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  // Liveness + readiness: verifies the process is up AND the database is
  // reachable. Uptime monitors and load balancers poll this.
  app.get("/api/health", async (_req, res) => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        ok: true,
        service: "radiues-api",
        db: "ok",
        uptimeSeconds: Math.round(process.uptime()),
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        ok: false,
        service: "radiues-api",
        db: "unreachable",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/food", foodRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/rides", ridesRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/groups", groupsRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/shop", shopRouter);
  app.use("/api/subscription", subscriptionRouter);

  // Back-office consoles (developer / admin / super-admin) under one namespace,
  // behind a tighter rate limit than the consumer API. The routers themselves
  // enforce RBAC; this is defense-in-depth against brute-forcing the surface.
  const consoleLimiter = rateLimit({
    windowMs: 60_000,
    limit: env.NODE_ENV === "test" ? 1000 : 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests." },
  });
  app.use("/api/console", consoleLimiter);
  // Step-up-aware identity probe for the console UI: succeeds only for an
  // operator whose session has cleared 2FA. The guard returns 403
  // step_up_required (→ OTP screen) or 404 (→ not an operator) otherwise, so the
  // frontend can route correctly before rendering any console page.
  app.get(
    "/api/console/whoami",
    requireRole("developer", "admin", "super_admin"),
    async (req, res) => {
      res.json({ id: req.userId, role: req.userRole });
    },
  );
  app.use("/api/console/dev", devRouter);
  app.use("/api/console/admin", adminRouter);
  app.use("/api/console/super", superRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
