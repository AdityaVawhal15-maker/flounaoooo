import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// The rider's messages are theirs and are kept. The driver's are produced from
// the states the ride has actually reached, which is what stops the screen
// being a puppet show: a reload must not invent fresh things the driver said,
// and a driver who has not arrived must not claim to be outside.

const ride = {
  domain: "ride",
  provider: "rapido",
  productName: "Rapido Bike",
  pickup: "Gachibowli",
  drop: "Hitech City",
  pickupLat: 17.4401,
  pickupLng: 78.3489,
  dropLat: 17.4435,
  dropLng: 78.3772,
};

type Agent = Awaited<ReturnType<typeof authedAgent>>["agent"];

async function bookAndPay(agent: Agent): Promise<string> {
  const made = await agent.post("/api/orders").send(ride).expect(201);
  const id = made.body.order.id;
  await agent.post("/api/payments/simulate").send({ orderId: id, method: "upi" }).expect(200);
  return id;
}

/**
 * Move the ride's clock back so the simulation has reached a captain.
 *
 * The alternative is sleeping through the twelve-second search in every test
 * that needs a driver, which buys nothing: the states are a function of
 * elapsed time, so backdating the anchor exercises the same code.
 */
async function ageRide(orderId: string, seconds: number): Promise<void> {
  const when = new Date(Date.now() - seconds * 1000);
  await prisma.order.update({ where: { id: orderId }, data: { createdAt: when } });
  await prisma.trackingEvent.updateMany({ where: { orderId }, data: { createdAt: when } });
}

describe("talking to the driver", () => {
  it("refuses before the ride is paid for", async () => {
    const { agent } = await authedAgent();
    const made = await agent.post("/api/orders").send(ride).expect(201);
    await agent.get(`/api/orders/${made.body.order.id}/messages`).expect(409);
  });

  it("has no driver on a food order", async () => {
    const { agent } = await authedAgent();
    const food = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "dum-biryani", platform: "ondc" })
      .expect(201);
    await agent.get(`/api/orders/${food.body.order.id}/messages`).expect(400);
  });

  it("stays quiet while no captain has been found", async () => {
    // A driver who does not exist yet must not be saying they accepted. This
    // is the whole reason the driver's side is tied to real states.
    const { agent } = await authedAgent();
    const id = await bookAndPay(agent);
    const res = await agent.get(`/api/orders/${id}/messages`).expect(200);
    expect(res.body.messages.filter((m: { sender: string }) => m.sender === "driver")).toHaveLength(0);
  });

  it("opens with the driver having accepted, and says it is simulated", async () => {
    const { agent } = await authedAgent();
    const id = await bookAndPay(agent);
    await ageRide(id, 30); // past the captain search
    const res = await agent.get(`/api/orders/${id}/messages`).expect(200);
    expect(res.body.simulated).toBe(true);
    const driver = res.body.messages.filter((m: { sender: string }) => m.sender === "driver");
    expect(driver.length).toBeGreaterThan(0);
    expect(driver[0].body).toMatch(/accepted your ride/i);
    expect(driver.every((m: { simulated: boolean }) => m.simulated)).toBe(true);
  });

  it("does not invent more of the driver's side on a reload", async () => {
    const { agent } = await authedAgent();
    const id = await bookAndPay(agent);
    await ageRide(id, 30);
    const first = await agent.get(`/api/orders/${id}/messages`).expect(200);
    const again = await agent.get(`/api/orders/${id}/messages`).expect(200);
    const count = (r: { body: { messages: { sender: string }[] } }) =>
      r.body.messages.filter((m) => m.sender === "driver").length;
    expect(count(again)).toBe(count(first));
  });

  it("does not re-announce the arrival time as it counts down", async () => {
    // The arrival line carries a number that changes every minute. Deduping on
    // the text made each new number look like a new thing to say, and the
    // driver narrated a countdown at the rider.
    const { agent } = await authedAgent();
    const id = await bookAndPay(agent);
    await ageRide(id, 30);
    await agent.get(`/api/orders/${id}/messages`).expect(200);
    await ageRide(id, 120); // a lot closer now, so the ETA has changed
    const res = await agent.get(`/api/orders/${id}/messages`).expect(200);

    const arrivals = res.body.messages.filter((m: { sender: string; body: string }) =>
      m.sender === "driver" && /I'll be there/i.test(m.body),
    );
    expect(arrivals).toHaveLength(1);
  });

  it("keeps what the rider sends, marked as theirs", async () => {
    const { agent } = await authedAgent();
    const id = await bookAndPay(agent);
    await agent
      .post(`/api/orders/${id}/messages`)
      .send({ body: "I'm wearing a blue jacket." })
      .expect(201);
    const res = await agent.get(`/api/orders/${id}/messages`).expect(200);
    const mine = res.body.messages.find((m: { sender: string }) => m.sender === "rider");
    expect(mine.body).toBe("I'm wearing a blue jacket.");
    expect(mine.simulated).toBe(false);
  });

  it("will not carry another person's ride", async () => {
    const one = await authedAgent();
    const two = await authedAgent();
    const id = await bookAndPay(one.agent);
    await two.agent.get(`/api/orders/${id}/messages`).expect(404);
    await two.agent.post(`/api/orders/${id}/messages`).send({ body: "hello" }).expect(404);
  });

  it("takes no empty message and no unknown field", async () => {
    const { agent } = await authedAgent();
    const id = await bookAndPay(agent);
    await agent.post(`/api/orders/${id}/messages`).send({ body: "   " }).expect(400);
    await agent
      .post(`/api/orders/${id}/messages`)
      .send({ body: "hi", sender: "driver" })
      .expect(400);
  });
});
