#!/usr/bin/env node
// Creates the production Postgres schema.
//
// Why this exists instead of `prisma migrate deploy`:
//
// The migration history in prisma/migrations was generated against SQLite. Its
// SQL contains PRAGMA statements and DATETIME columns, which Postgres rejects —
// so replaying that history against a Postgres database fails on the first
// migration. Prisma migrations are provider-specific and cannot be reused
// across providers.
//
// Since production starts empty, the correct move is to baseline: generate the
// schema as one DDL script from schema.prisma, apply it, and record it as the
// initial migration so future `migrate deploy` runs work normally.
//
// Usage:
//   DATABASE_URL=postgresql://... node scripts/pg-baseline.mjs [--apply]
//
// Without --apply it prints what it would do and writes the SQL for review.
// Nothing touches the database until --apply is passed.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, "..");
const schemaPath = join(serverDir, "prisma", "schema.prisma");

const apply = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;

const die = (msg) => {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
};

if (!url) die("DATABASE_URL is not set.");
if (!/^postgres(ql)?:\/\//.test(url)) {
  die(`DATABASE_URL is not a Postgres URL (got "${url.split(":")[0]}:..."). This script only baselines Postgres.`);
}

// The schema on disk must already say postgresql, or the generated DDL would be
// SQLite flavoured — the exact problem this script exists to avoid.
const schema = readFileSync(schemaPath, "utf8");
if (!/provider\s*=\s*"postgresql"/.test(schema)) {
  die('schema.prisma is not set to postgresql. Run `npm run db:provider postgresql` first.');
}

const run = (args, opts = {}) =>
  execFileSync("npx", ["prisma", ...args], {
    cwd: serverDir,
    encoding: "utf8",
    stdio: opts.capture ? "pipe" : "inherit",
    shell: process.platform === "win32",
  });

console.log("\nBaselining Postgres from schema.prisma\n");

// 1. Generate the whole schema as one DDL script, offline.
const ddl = run(
  ["migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"],
  { capture: true },
);
const tables = (ddl.match(/CREATE TABLE/g) ?? []).length;
console.log(`  generated DDL: ${tables} tables, ${ddl.split("\n").length} lines`);

// 2. Write it as the initial migration so migrate deploy has a history to
//    continue from after this.
const migDir = join(serverDir, "prisma", "migrations", "0_init");
if (!apply) {
  const preview = join(serverDir, "prisma", "pg-init.preview.sql");
  writeFileSync(preview, ddl);
  console.log(`  wrote preview: ${preview}`);
  console.log("\n  Dry run. Re-run with --apply to create the schema.\n");
  process.exit(0);
}

// 3. Refuse to touch a database that already contains anything. This script
//    CREATES a schema; it is not a migration path for a populated database,
//    and the push below is allowed to drop columns. Asking Prisma to diff the
//    live database down to empty tells us what is there without needing a
//    driver: any DROP means the database is not blank.
let dropCheck;
try {
  dropCheck = run(["migrate", "diff", "--from-url", url, "--to-empty", "--script"], {
    capture: true,
  });
} catch {
  // Almost always an unreachable host or bad credentials. Fail here, before
  // anything touches the database.
  die(
    "Could not reach the database to check whether it is empty.\n" +
      "  Verify DATABASE_URL, that the server is running, and that it accepts\n" +
      "  connections from this host. Nothing has been changed.",
  );
}
const drops = (dropCheck.match(/DROP TABLE/gi) ?? []).length;
if (drops > 0 && !process.argv.includes("--force")) {
  die(
    `Refusing to run: the target database already has ${drops} table(s).\n` +
      `  This script creates a fresh schema and may drop columns to do it.\n` +
      `  If you are certain the data is disposable, re-run with --force.`,
  );
}
console.log(`  target database is empty (${drops} existing tables)`);

if (existsSync(migDir)) {
  console.log("  0_init already exists — leaving it as is");
} else {
  mkdirSync(migDir, { recursive: true });
  writeFileSync(join(migDir, "migration.sql"), ddl);
  console.log(`  wrote ${migDir}/migration.sql`);
}

// 4. Apply the schema, then mark the baseline as applied so subsequent
//    `prisma migrate deploy` runs pick up from here.
console.log("\n  applying schema to the database...");
// --accept-data-loss only when the operator has explicitly forced past the
// emptiness check above. On a blank database there is no data to lose, so the
// flag is unnecessary — and leaving it on by default is how a rerun destroys
// a live database.
run([
  "db",
  "push",
  "--skip-generate",
  ...(process.argv.includes("--force") ? ["--accept-data-loss"] : []),
]);
try {
  run(["migrate", "resolve", "--applied", "0_init"]);
  console.log("  recorded 0_init as applied");
} catch {
  console.log("  note: 0_init was already recorded");
}

run(["generate"]);
console.log("\n  Done. Future schema changes use the normal migrate workflow.\n");
