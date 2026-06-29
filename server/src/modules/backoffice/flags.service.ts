// Server-side feature flags, toggled from the developer console. Lets us gate
// risky behaviour (ONDC live, hybrid AI re-rank, …) without a redeploy. Reads
// are cached briefly so request-time checks stay cheap; the dev console
// invalidates the cache on every toggle.

import { prisma } from "../../lib/prisma.js";

// Known flags with their default (off) and a description, so the console can
// list them even before a row exists. Unknown keys are simply treated as off.
export const KNOWN_FLAGS: { key: string; description: string }[] = [
  { key: "ondc_live", description: "Route real orders through the ONDC network (off = simulation)." },
  { key: "hybrid_ai_rerank", description: "Let the LLM re-rank the engine's top picks (needs an AI key)." },
  { key: "predictions_push", description: "Send proactive prediction nudges as web push notifications." },
  { key: "maintenance_mode", description: "Show a maintenance banner and pause new orders." },
];

type CacheEntry = { value: boolean; at: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

export function invalidateFlagCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function isFlagEnabled(key: string): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  const value = row?.enabled ?? false;
  cache.set(key, { value, at: Date.now() });
  return value;
}

// All flags for the console: merges DB rows over the known-flag defaults so the
// list is complete even for flags never toggled yet.
export async function listFlags(): Promise<
  { key: string; enabled: boolean; description: string; updatedAt: Date | null }[]
> {
  const rows = await prisma.featureFlag.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const merged = KNOWN_FLAGS.map((f) => {
    const row = byKey.get(f.key);
    return {
      key: f.key,
      enabled: row?.enabled ?? false,
      description: row?.description ?? f.description,
      updatedAt: row?.updatedAt ?? null,
    };
  });
  // Include any ad-hoc flags that exist in the DB but aren't in KNOWN_FLAGS.
  for (const row of rows) {
    if (!KNOWN_FLAGS.some((f) => f.key === row.key)) {
      merged.push({
        key: row.key,
        enabled: row.enabled,
        description: row.description ?? "",
        updatedAt: row.updatedAt,
      });
    }
  }
  return merged;
}

export async function setFlag(
  key: string,
  enabled: boolean,
  updatedById: string,
): Promise<void> {
  const known = KNOWN_FLAGS.find((f) => f.key === key);
  await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled, updatedById },
    create: { key, enabled, description: known?.description, updatedById },
  });
  invalidateFlagCache(key);
}
