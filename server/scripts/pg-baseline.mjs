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
import { writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
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

const run = (args, opts = {}) => {
  try {
    return execFileSync("npx", ["prisma", ...args], {
      cwd: serverDir,
      encoding: "utf8",
      stdio: opts.capture ? "pipe" : "inherit",
      shell: process.platform === "win32",
    });
  } catch (err) {
    // migrate status exits non-zero when anything is pending, which is a
    // reading we want rather than a crash.
    if (opts.allowFail) return String(err.stdout ?? "") + String(err.stderr ?? "");
    throw err;
  }
};

console.log("\nBaselining Postgres from schema.prisma\n");

// 1. Generate the whole schema as one DDL script, offline.
const ddl = run(
  ["migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"],
  { capture: true },
);
const tables = (ddl.match(/CREATE TABLE/g) ?? []).length;
console.log(`  generated DDL: ${tables} tables, ${ddl.split("\n").length} lines`);

// 2. Without --apply, stop here with the SQL written out for review.
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

// The migration history was generated against SQLite and its lock file still
// says so, which makes Prisma refuse every migrate command against Postgres
// (P3019). Point the lock at the provider we are actually baselining.
const lockPath = join(serverDir, "prisma", "migrations", "migration_lock.toml");
if (existsSync(lockPath)) {
  const lock = readFileSync(lockPath, "utf8");
  if (!/provider\s*=\s*"postgresql"/.test(lock)) {
    writeFileSync(lockPath, lock.replace(/provider\s*=\s*".*"/, 'provider = "postgresql"'));
    console.log("  migration_lock.toml -> postgresql");
  }
}

// 4. Create the schema, then record the history so subsequent
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
// db push created the schema but recorded no history, so Prisma would treat
// every existing migration as pending and try to replay SQLite SQL on the next
// deploy. Mark them applied: the state they describe is present, which is what
// baselining an existing database means.
const migrations = readdirSync(join(serverDir, "prisma", "migrations"), {
  withFileTypes: true,
})
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

console.log(`\n  recording ${migrations.length} migrations as applied...`);
const failed = [];
for (const name of migrations) {
  try {
    run(["migrate", "resolve", "--applied", name], { capture: true });
  } catch {
    failed.push(name);
  }
}
if (failed.length) {
  // Never report success here. An unrecorded baseline looks fine until the
  // next deploy tries to replay SQLite migrations against Postgres.
  die(
    `Could not record ${failed.length} of ${migrations.length} migrations:\n` +
      failed.map((f) => `    - ${f}`).join("\n") +
      "\n  The schema exists but its history does not, so the next migrate\n" +
      "  deploy will fail. Resolve these before serving traffic.",
  );
}

// Prove it rather than assume it — the failure this script exists to prevent
// is a baseline that silently did not happen.
const check = run(
  ["migrate", "status"],
  { capture: true, allowFail: true },
);
if (/have not yet been applied|pending/i.test(check)) {
  die("Migrations still report as pending after baselining:\n" + check);
}
console.log(`  recorded ${migrations.length} migrations`);

// The database work is finished and correct by this point. Generating the
// client is a local build step, and on Windows it fails with EPERM whenever
// another node process holds the query engine. Exiting non-zero here would
// report the baseline as failed and invite a re-run — which the emptiness
// guard would then refuse, for reasons that look unrelated.
try {
  run(["generate"]);
} catch {
  console.log(
    "\n  NOTE: the schema and its history are in place, but `prisma generate`\n" +
      "  did not complete — usually another node process holding the client on\n" +
      "  Windows. Stop it and run `npx prisma generate`. Nothing needs redoing.",
  );
}
console.log("\n  Done. Future schema changes use the normal migrate workflow.\n");
