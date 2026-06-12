import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { foodRouter } from "./modules/food/food.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { ridesRouter } from "./modules/rides/rides.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

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

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "radiues-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/food", foodRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/rides", ridesRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/users", usersRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
