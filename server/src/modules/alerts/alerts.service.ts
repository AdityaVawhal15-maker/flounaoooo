import { prisma } from "../../lib/prisma.js";
import { sendPushToUser } from "../notifications/push.service.js";
import { emitToUser } from "../../realtime/socket.js";

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
      body: `Now ₹${rupees} — at or below your ₹${Math.round(alert.targetPaise / 100)} target.`,
      url: alert.domain === "food" ? "/food" : "/rides",
    });
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
