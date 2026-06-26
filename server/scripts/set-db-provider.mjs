#!/usr/bin/env node
// Switches the Prisma datasource provider in prisma/schema.prisma between
// "sqlite" (local dev) and "postgresql" (production). Prisma does not allow
// env() for the provider, so we rewrite that single line from an env/arg.
//
// Usage:
//   node scripts/set-db-provider.mjs            # reads DB_PROVIDER env
//   node scripts/set-db-provider.mjs postgresql # explicit
//   DB_PROVIDER=postgresql npm run db:provider
//
// Run this before `prisma migrate deploy` / `prisma generate` on the target
// environment. Dev stays on sqlite by default; CI/prod set DB_PROVIDER=postgresql.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "prisma", "schema.prisma");

const provider = (process.argv[2] || process.env.DB_PROVIDER || "sqlite").trim();
const allowed = ["sqlite", "postgresql"];
if (!allowed.includes(provider)) {
  console.error(`Invalid provider "${provider}". Use one of: ${allowed.join(", ")}`);
  process.exit(1);
}

const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /(datasource db \{[^}]*?provider\s*=\s*)"(sqlite|postgresql)"/s,
  `$1"${provider}"`,
);

if (updated === schema) {
  console.log(`Datasource provider already "${provider}" — no change.`);
} else {
  writeFileSync(schemaPath, updated);
  console.log(`Datasource provider set to "${provider}".`);
}
