import { prisma } from "../../lib/prisma.js";
import type { FulfilmentState } from "../providers/types.js";

/**
 * The driver's side of a ride conversation.
 *
 * Every line here is tied to a state the ride has actually reached, and each
 * is written once. That is the difference between a chat and a puppet show:
 * the rider is never told "I'm outside" by a driver who, in the simulation,
 * has not arrived yet, and reloading the screen does not produce a fresh set
 * of things the driver supposedly said.
 *
 * Marked simulated on the way in, because no live driver network is connected
 * and the screen keeps saying so. When a real network is, these stop being
 * generated and the provider's own messages take their place.
 */
const SCRIPT: { state: FulfilmentState; key: string; body: (ctx: Ctx) => string }[] = [
  {
    state: "assigned",
    key: "accepted",
    body: () => "Hello! I have accepted your ride.",
  },
  {
    state: "arriving",
    key: "eta",
    body: (c) =>
      c.etaMinutes > 0
        ? `I'll be there in about ${c.etaMinutes} ${c.etaMinutes === 1 ? "minute" : "minutes"}.`
        : "I'm on my way to you now.",
  },
  {
    state: "arrived",
    key: "here",
    body: (c) => `I've reached the pickup point${c.plate ? ` — ${c.plate}.` : "."}`,
  },
  {
    state: "arrived",
    key: "otp",
    body: () => "Please share the OTP when you get in.",
  },
  {
    state: "in_progress",
    key: "moving",
    body: () => "We're on the way. Sit back and relax.",
  },
  {
    state: "completed",
    key: "thanks",
    body: () => "Thanks for riding with me today.",
  },
];

type Ctx = { etaMinutes: number; plate: string | null };

const ORDER: FulfilmentState[] = [
  "searching",
  "assigned",
  "arriving",
  "arrived",
  "in_progress",
  "completed",
];

/**
 * Writes any driver messages the ride has reached and does not have yet.
 *
 * Idempotent by design: the key is stored at the head of the body so a message
 * already written is never written twice, however often the screen polls.
 */
export async function catchUpDriverMessages(opts: {
  orderId: string;
  state: FulfilmentState;
  etaMinutes: number;
  plate: string | null;
}): Promise<void> {
  if (opts.state === "cancelled") return;
  const reached = ORDER.indexOf(opts.state);
  if (reached < 0) return;

  const existing = await prisma.rideMessage.findMany({
    where: { orderId: opts.orderId, sender: "driver" },
    select: { scriptKey: true },
  });
  const said = new Set(existing.map((m) => m.scriptKey));

  for (const line of SCRIPT) {
    if (ORDER.indexOf(line.state) > reached) break;
    if (said.has(line.key)) continue;
    said.add(line.key);
    const body = line.body({ etaMinutes: opts.etaMinutes, plate: opts.plate });
    // On the key, never on the text. The arrival line carries a countdown, so
    // matching on what it says meant "about 2 minutes" and "about 1 minute"
    // looked like different lines and the driver re-announced the ETA every
    // minute. Two polls at once race here, so a duplicate is caught by the
    // constraint and dropped rather than surfaced.
    await prisma.rideMessage
      .create({
        data: {
          orderId: opts.orderId,
          sender: "driver",
          scriptKey: line.key,
          body,
          simulated: true,
        },
      })
      .catch(() => null);
  }
}
