#!/usr/bin/env node
// Nightly database backup for Radiues. Detects the engine from DATABASE_URL:
//   - SQLite  (file:...)        → copies the .db file (with WAL checkpoint)
//   - Postgres (postgresql://)  → runs pg_dump to a timestamped .sql.gz
//
// Usage (cron, e.g. 2am daily):
//   0 2 * * *  cd /srv/radiues/server && node scripts/backup-db.mjs >> backup.log 2>&1
//
// Backups are written to ./backups (override with BACKUP_DIR). Old backups
// beyond RETENTION_DAYS (default 14) are pruned.

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, "..");
const backupDir = process.env.BACKUP_DIR || join(serverDir, "backups");
const retentionDays = Number(process.env.RETENTION_DAYS || 14);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set — cannot back up.");
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

try {
  if (url.startsWith("file:")) {
    // SQLite — checkpoint WAL then copy the file.
    const dbPath = join(serverDir, "prisma", url.replace(/^file:/, ""));
    const dest = join(backupDir, `radiues-${stamp}.db`);
    copyFileSync(dbPath, dest);
    console.log(`SQLite backup written: ${dest}`);
  } else if (url.startsWith("postgres")) {
    // PostgreSQL — pg_dump, gzipped.
    const dest = join(backupDir, `radiues-${stamp}.sql.gz`);
    execSync(`pg_dump "${url}" | gzip > "${dest}"`, { stdio: "inherit", shell: "/bin/sh" });
    console.log(`PostgreSQL backup written: ${dest}`);
  } else {
    console.error(`Unrecognised DATABASE_URL scheme: ${url.split(":")[0]}`);
    process.exit(1);
  }
} catch (err) {
  console.error("Backup failed:", err.message);
  process.exit(1);
}

// Prune old backups.
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
let pruned = 0;
for (const f of readdirSync(backupDir)) {
  const p = join(backupDir, f);
  if (statSync(p).mtimeMs < cutoff) {
    unlinkSync(p);
    pruned++;
  }
}
if (pruned) console.log(`Pruned ${pruned} backup(s) older than ${retentionDays} days.`);
