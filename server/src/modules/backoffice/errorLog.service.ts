// Captures server errors into the DB so engineers see failures on the developer
// console without shell access. Identical errors are grouped by a fingerprint
// (the count rises instead of flooding the table). Best-effort: a logging
// failure must never mask the original error or take a request down.

import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";

function topFrame(stack?: string): string {
  if (!stack) return "";
  // First stack line after the message — enough to distinguish call sites.
  const lines = stack.split("\n").map((l) => l.trim());
  return lines.find((l) => l.startsWith("at ")) ?? "";
}

function fingerprintOf(name: string, message: string, stack?: string): string {
  return crypto
    .createHash("sha256")
    .update(`${name}|${message}|${topFrame(stack)}`)
    .digest("hex")
    .slice(0, 32);
}

export type CaptureInput = {
  err: unknown;
  route?: string; // "GET /api/foo"
  statusCode?: number;
  userId?: string | null;
};

export async function captureToErrorLog(input: CaptureInput): Promise<void> {
  try {
    const e = input.err;
    const name = e instanceof Error ? e.name : "UnknownError";
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack ?? undefined : undefined;
    const fingerprint = fingerprintOf(name, message, stack);
    const now = new Date();

    // Upsert by fingerprint: bump count + lastSeen, or create the first row.
    await prisma.errorLog.upsert({
      where: { fingerprint },
      update: {
        count: { increment: 1 },
        lastSeen: now,
        // A recurrence un-resolves it so engineers notice it came back.
        resolved: false,
        route: input.route,
        statusCode: input.statusCode,
        userId: input.userId ?? undefined,
      },
      create: {
        fingerprint,
        name,
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 8000),
        route: input.route,
        statusCode: input.statusCode,
        userId: input.userId ?? undefined,
      },
    });
  } catch {
    // Swallow — logging the log failure would risk a loop. The original error
    // is still returned to the client and reported to monitoring separately.
  }
}
