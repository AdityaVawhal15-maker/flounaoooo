import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// Fresh schema in a dedicated SQLite file before the suite runs.
export default function setup() {
  const dbPath = path.join(__dirname, "..", "prisma", "test.db");
  rmSync(dbPath, { force: true });
  execSync("npx prisma db push --skip-generate", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
