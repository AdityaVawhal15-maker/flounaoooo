import { prisma } from "../../lib/prisma.js";
import type { DecisionTrace } from "./scoring.js";

// Records how a recommendation was reached, so a past ranking can be
// reconstructed and explained.
//
// ONDC's buyer-app disclosure asks a buyer app to account for its listing and
// ranking behaviour. Price observations record what an option cost; only this
// records why one option was placed above another — which filters removed what,
// which weights were applied, and what every surviving option scored.
//
// Writes are fire-and-forget, exactly like price observations: a logging fault
// must never surface as a failed search.

/** Keep the stored ordering useful without letting one row grow unbounded. */
const MAX_SCORED_ROWS = 20;

export function recordDecision(input: {
  userId?: string | null;
  domain: "food" | "ride";
  /** The user's search text, or a route summary for rides. */
  query: string;
  trace: DecisionTrace;
}): void {
  const { trace } = input;

  void prisma.decisionLog
    .create({
      data: {
        userId: input.userId ?? null,
        domain: input.domain,
        query: input.query.slice(0, 500),
        priority: trace.priority,
        weights: JSON.stringify(trace.weights),
        personalized: trace.personalized,
        candidateCount: trace.candidateCount,
        excludedCount: trace.excludedCount,
        exclusions: trace.exclusions.length ? JSON.stringify(trace.exclusions) : null,
        // Best-first, truncated: the top of the ordering is what explains the
        // decision, and a pathological result set shouldn't bloat a row.
        results: JSON.stringify(trace.scores.slice(0, MAX_SCORED_ROWS)),
        chosenKey: trace.chosenKey,
      },
    })
    .catch(() => {
      // Best-effort by design; never block or fail a user's request.
    });
}

/**
 * Delete entries older than the retention window. Called by the maintenance
 * job. Returns the number removed so the caller can log it.
 */
export async function pruneDecisionLogs(
  retentionDays: number,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.decisionLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}
