// Platform configuration — commission + alert thresholds set from the
// super-admin Settings page. A single "default" row; we lazily create it with
// safe defaults on first read. Values are integers (bps / %) to honour the
// integer-money rule. Cached briefly; the settings update invalidates the cache.

import { prisma } from "../../lib/prisma.js";

export type PlatformConfigValues = {
  ondcMinMarginBps: number;
  ondcMaxMarginBps: number;
  partnerAffiliateMinBps: number;
  cashbackUserSharePct: number;
  apiFailureRatePct: number;
  decisionLatencyAlertSec: number;
  ondcPingAlertMs: number;
};

let cache: { values: PlatformConfigValues; at: number } | null = null;
const TTL_MS = 30_000;

export async function getConfig(): Promise<PlatformConfigValues> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;
  const row = await prisma.platformConfig.upsert({
    where: { key: "default" },
    update: {},
    create: { key: "default" },
  });
  const values: PlatformConfigValues = {
    ondcMinMarginBps: row.ondcMinMarginBps,
    ondcMaxMarginBps: row.ondcMaxMarginBps,
    partnerAffiliateMinBps: row.partnerAffiliateMinBps,
    cashbackUserSharePct: row.cashbackUserSharePct,
    apiFailureRatePct: row.apiFailureRatePct,
    decisionLatencyAlertSec: row.decisionLatencyAlertSec,
    ondcPingAlertMs: row.ondcPingAlertMs,
  };
  cache = { values, at: Date.now() };
  return values;
}

// DPIIT/ONDC norms cap the margin band at 3–6%. We clamp on write so the
// console can never set a non-compliant commission, regardless of the input.
const ONDC_FLOOR_BPS = 300;
const ONDC_CEIL_BPS = 600;

export async function updateConfig(
  patch: Partial<PlatformConfigValues>,
  updatedById: string,
): Promise<PlatformConfigValues> {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const data: Partial<PlatformConfigValues> = { ...patch };
  if (data.ondcMinMarginBps != null)
    data.ondcMinMarginBps = clamp(data.ondcMinMarginBps, ONDC_FLOOR_BPS, ONDC_CEIL_BPS);
  if (data.ondcMaxMarginBps != null)
    data.ondcMaxMarginBps = clamp(data.ondcMaxMarginBps, ONDC_FLOOR_BPS, ONDC_CEIL_BPS);
  if (data.cashbackUserSharePct != null)
    data.cashbackUserSharePct = clamp(data.cashbackUserSharePct, 0, 100);

  await prisma.platformConfig.upsert({
    where: { key: "default" },
    update: { ...data, updatedById },
    create: { key: "default", ...data, updatedById },
  });
  cache = null; // invalidate
  return getConfig();
}
