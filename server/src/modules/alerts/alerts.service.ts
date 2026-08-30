import { prisma } from "../../lib/prisma.js";
import { sendPushToUser } from "../notifications/push.service.js";
import { emitToUser } from "../../realtime/socket.js";
import { enqueueNotification } from "../notifications/outbox.service.js";

// The latest observed best price for an item, from the same PriceObservation
// data the timing advisor records on every quote. Returns null if unseen.
async function latestBestPaise(
  domain: string,
  itemKey: string,
): Promise<number | null> {
  const row = await prisma.priceObservation.findFirst({
    where: { domain, key: itemKey },
    orderBy: { createdAt: "desc" },
    select: { bestPaise: true },
  });
  return row?.bestPaise ?? null;
}

// Checks every active alert; for any whose item is now at/below its target,
// deactivates it and notifies the owner via push + realtime. Returns the count.
export async function checkPriceAlerts(): Promise<number> {
  const alerts = await prisma.priceAlert.findMany({
    where: { active: true },
    take: 500,
  });

  let triggered = 0;
  for (const alert of alerts) {
    const best = await latestBestPaise(alert.domain, alert.itemKey);
    if (best === null || best > alert.targetPaise) continue;

    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: { active: false, triggeredAt: new Date(), lastSeenPaise: best },
    });

    const rupees = Math.round(best / 100);
    void sendPushToUser(alert.userId, {
      title: `Price drop: ${alert.itemName} 🔻`,
      body: `Now ₹${rupees}, at or below your ₹${Math.round(alert.targetPaise / 100)} target.`,
      url: alert.domain === "food" ? "/food" : "/rides",
    });
    // Email is the second channel (money-updates gated). Dedupe per alert so a
    // re-triggered/re-armed alert can't double-mail for the same event. Awaited
    // (one insert) so the alert isn't marked done before the email is queued.
    await enqueueNotification(
      alert.userId,
      "money.price_drop",
      {
        item: alert.itemName,
        price: `₹${rupees}`,
        target: `₹${Math.round(alert.targetPaise / 100)}`,
        domain: alert.domain,
      },
      // One email per (alert, observed price) — a re-armed alert that fires at
      // a new price mails again; the same price never double-mails.
      { dedupeKey: `price_drop:${alert.id}:${best}` },
    ).catch(() => {});
    emitToUser(alert.userId, "price-alert", {
      alertId: alert.id,
      itemName: alert.itemName,
      domain: alert.domain,
      newPaise: best,
      targetPaise: alert.targetPaise,
    });
    triggered++;
  }
  return triggered;
}
