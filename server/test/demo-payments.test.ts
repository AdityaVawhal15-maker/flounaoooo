import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Demo mode marks orders paid without taking any money. It exists so a pitch
// does not depend on a third-party checkout loading over the room's wifi, and
// it must be impossible to turn on where real customers are.
//
// Booted as a real process rather than imported, because the thing being
// checked is that a production server refuses to start at all — a guard that
// only holds inside the test runner would not be the guard we need.

describe("demo payments", () => {
  it("stop a production server from starting", () => {
    let message = "";
    try {
      execFileSync(
        process.execPath,
        ["--input-type=module", "-e", "await import('./dist/config/env.js')"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_ENV: "production",
            DEMO_PAYMENTS: "true",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } catch (err) {
      message = String((err as { stderr?: Buffer }).stderr ?? "");
    }
    // Either it refused for this reason, or it refused for another production
    // requirement first (real secrets, and so on). What must never happen is a
    // clean start with demo payments on.
    expect(message).not.toBe("");
    expect(message).toMatch(/DEMO_PAYMENTS|production/i);
  });
});
