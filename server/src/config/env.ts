import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  // Root for uploaded complaint evidence. Relative paths resolve from the
  // server working directory. Tests point this at a temp dir so a run never
  // writes into the working tree.
  UPLOAD_DIR: z.string().default("uploads"),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email OTP — in development, leave SMTP unset and codes are printed to the console.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Flouna <no-reply@flouna.app>"),

  // LLM providers — hybrid setup (Claude / Gemini / DeepSeek). Chat falls back
  // to a scripted demo mode if the selected provider's key is unset.
  LLM_PROVIDER: z.enum(["anthropic", "google", "deepseek", "demo"]).default("demo"),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  // Google AI Studio (Gemini). Free-tier friendly; model is overridable.
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_MODEL: z.string().default("gemini-2.0-flash"),

  // Cashfree sandbox
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),

  // Maps
  MAPTILER_KEY: z.string().optional(),
  GEOAPIFY_KEY: z.string().optional(),
  ORS_KEY: z.string().optional(),
  // Weather (context engine). Open-Meteo is keyless, so weather-aware advice
  // works without this; the key only switches to a paid provider if set later.
  WEATHER_API_KEY: z.string().optional(),

  // Web push (VAPID). Generate with: npx web-push generate-vapid-keys
  // Public key is also exposed to the browser as NEXT_PUBLIC_VAPID_PUBLIC_KEY.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:support@flouna.app"),

  // Fulfilment provider. "simulation" runs the full booking/tracking flow with
  // a simulated captain + driver GPS (works with no third-party access).
  // "ondc" switches to the real ONDC mobility adapter — requires the network
  // credentials below (your registered Buyer App). Flip this once onboarded.
  PROVIDER_MODE: z.enum(["simulation", "ondc"]).default("simulation"),
  ONDC_BASE_URL: z.string().url().optional(), // Buyer App gateway endpoint
  ONDC_SUBSCRIBER_ID: z.string().optional(),
  ONDC_SIGNING_PRIVATE_KEY: z.string().optional(),
  ONDC_SIGNING_PUBLIC_KEY: z.string().optional(),

  // ₹50/month premium tier. Reuses the Cashfree gateway for the recurring
  // charge; falls back to a simulated activation in dev when unset.
  SUBSCRIPTION_PRICE_PAISE: z.coerce.number().default(5000),

  // Error monitoring (Sentry). Optional — when unset, monitoring is a no-op
  // and errors are logged to the console as today.
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

// Production safety gate: refuse to boot with a dev-grade configuration in
// production, so we never accidentally ship with weak secrets or a dev database.
if (isProd) {
  const problems: string[] = [];
  if (env.DATABASE_URL.startsWith("file:")) {
    problems.push("DATABASE_URL points at a local SQLite file — use PostgreSQL in production");
  }
  if (env.JWT_ACCESS_SECRET.length < 48) {
    problems.push("JWT_ACCESS_SECRET is too short for production (use 48+ random chars)");
  }
  if (env.JWT_REFRESH_SECRET.length < 48) {
    problems.push("JWT_REFRESH_SECRET is too short for production (use 48+ random chars)");
  }
  if (!env.WEB_ORIGIN.startsWith("https://")) {
    problems.push("WEB_ORIGIN must be https:// in production (secure cookies require it)");
  }
  // The simulation adapter runs the whole booking flow — it invents a captain,
  // an OTP and a moving vehicle. That is exactly right in development and
  // indefensible in production, where a rider would be shown a driver who does
  // not exist. Nothing downstream can tell the difference, so the gate is here.
  if (env.PROVIDER_MODE === "simulation") {
    problems.push(
      "PROVIDER_MODE=simulation fabricates drivers, OTPs and live tracking — " +
        "set PROVIDER_MODE=ondc with ONDC_* credentials before serving real riders",
    );
  }
  if (env.PROVIDER_MODE === "ondc" && !env.ONDC_SUBSCRIBER_ID) {
    problems.push("PROVIDER_MODE=ondc but ONDC_SUBSCRIBER_ID is unset — the adapter cannot sign requests");
  }
  // Simulated payments are refused in production (see payments routes), so
  // without gateway credentials checkout has nowhere to go: the user reaches
  // the payment step and cannot complete it. Fail at boot instead.
  if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
    problems.push(
      "CASHFREE_APP_ID/CASHFREE_SECRET_KEY are unset — simulated payment is disabled " +
        "in production, so checkout would dead-end with no way to pay",
    );
  }
  if (problems.length > 0) {
    console.error("Refusing to start: unsafe production configuration:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  // Degraded but honest: worth saying out loud at boot, not worth refusing to
  // start over. Each leaves a real feature quietly switched off.
  const warnings: string[] = [];
  if (env.LLM_PROVIDER === "demo") {
    warnings.push("LLM_PROVIDER=demo — chat runs on the rule-based engine, not a model");
  }
  if (env.CASHFREE_ENV === "sandbox") {
    warnings.push("CASHFREE_ENV=sandbox — payments are not real money");
  }
  if (!env.VAPID_PUBLIC_KEY) {
    warnings.push("VAPID_PUBLIC_KEY unset — web push notifications are disabled");
  }
  if (warnings.length > 0) {
    console.warn("Starting with reduced functionality:");
    for (const w of warnings) console.warn(`  - ${w}`);
  }
}
