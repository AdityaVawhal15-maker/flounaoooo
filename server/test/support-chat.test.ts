import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Help Centre chat: the assistant, the handover to a person, and the rating
// that closes a conversation.
//
// The assistant is deterministic, so these assert the actual words where the
// answer matters, not just that some reply came back.

async function startChat(agent: request.Agent, topic?: string) {
  const res = await agent
    .post("/api/support/chats")
    .send(topic ? { topic } : {})
    .expect(201);
  return res.body.chat as {
    id: string;
    status: string;
    topic: string | null;
    messages: { role: string; body: string; options: { label: string; value: string }[] }[];
  };
}

const say = (agent: request.Agent, id: string, body: string) =>
  agent.post(`/api/support/chats/${id}/messages`).send({ body });

describe("help centre knowledge base", () => {
  it("lists topics and reads one article without a session", async () => {
    const list = await request(app).get("/api/support/topics").expect(200);
    expect(list.body.topics.length).toBeGreaterThan(10);

    const one = await request(app).get("/api/support/topics/refund-status").expect(200);
    expect(one.body.topic.title).toMatch(/refund/i);
    expect(Array.isArray(one.body.topic.article)).toBe(true);

    await request(app).get("/api/support/topics/not-a-real-topic").expect(404);
  });

  it("searches by what a customer would actually type", async () => {
    const res = await request(app)
      .get("/api/support/topics")
      .query({ q: "money deducted" })
      .expect(200);
    expect(res.body.topics.some((t: { slug: string }) => t.slug === "payment-failed-money-deducted"))
      .toBe(true);
  });

  it("groups topics for the Top Topics list", async () => {
    const res = await request(app).get("/api/support/groups").expect(200);
    const orders = res.body.groups.find((g: { group: string }) => g.group === "orders");
    expect(orders.topics.length).toBeGreaterThan(0);
  });
});

describe("help centre chat", () => {
  it("opens with a greeting and quick replies", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0]!.role).toBe("bot");
    expect(chat.messages[0]!.options.length).toBeGreaterThan(0);
  });

  it("opening on a topic answers that topic straight away", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent, "coupon-not-applied");
    expect(chat.topic).toBe("coupon-not-applied");
    expect(chat.messages[0]!.body).toMatch(/minimum order/i);
  });

  it("understands a question typed in the customer's own words", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    const res = await say(agent, chat.id, "my coupon code isn't working").expect(200);
    const last = res.body.chat.messages.at(-1);
    expect(last.role).toBe("bot");
    expect(last.body).toMatch(/minimum order/i);
  });

  it("answers with the customer's own order rather than generic advice", async () => {
    const { agent } = await authedAgent();
    // Give the account a real order to talk about.
    await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);

    const chat = await startChat(agent);
    const res = await say(agent, chat.id, "where is my order").expect(200);
    const last = res.body.chat.messages.at(-1);
    // It should name the actual order, not just describe how tracking works.
    expect(last.body).toMatch(/Your most recent one is/i);
    expect(res.body.chat.orderId).toBeTruthy();
  });

  it("says so plainly when it has not understood", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    const res = await say(agent, chat.id, "zzzz qqqq wwww").expect(200);
    const last = res.body.chat.messages.at(-1);
    expect(last.body).toMatch(/haven't understood/i);
    expect(last.options.some((o: { value: string }) => o.value === "__escalate")).toBe(true);
  });

  it("cannot be steered by a customer typing the control values", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    // Plain words must not trip the control path.
    const res = await say(agent, chat.id, "resolved").expect(200);
    expect(res.body.resolved).toBe(false);
    expect(res.body.chat.status).toBe("open");
  });
});

describe("handover to a person", () => {
  it("raises a real ticket carrying the transcript", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    await say(agent, chat.id, "my coupon code isn't working").expect(200);
    const res = await say(agent, chat.id, "__escalate").expect(200);

    expect(res.body.escalated).toBe(true);
    expect(res.body.ticketId).toBeTruthy();
    expect(res.body.chat.status).toBe("escalated");

    const ticket = await prisma.supportTicket.findUniqueOrThrow({
      where: { id: res.body.ticketId },
    });
    // The agent gets what the customer already said, not an empty form.
    expect(ticket.body).toMatch(/coupon/i);
    expect(ticket.body).toMatch(/Customer:/);
  });

  it("does not raise a second ticket for the same chat", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    const first = await say(agent, chat.id, "__escalate").expect(200);
    const second = await say(agent, chat.id, "__escalate").expect(200);
    expect(second.body.ticketId).toBe(first.body.ticketId);

    const count = await prisma.supportTicket.count({
      where: { id: first.body.ticketId },
    });
    expect(count).toBe(1);
  });
});

describe("ending a chat and rating it", () => {
  it("marks resolved, then accepts a rating once", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    const res = await say(agent, chat.id, "__resolved").expect(200);
    expect(res.body.resolved).toBe(true);
    expect(res.body.chat.status).toBe("resolved");
    expect(res.body.chat.endedAt).toBeTruthy();

    const rated = await agent
      .post(`/api/support/chats/${chat.id}/rating`)
      .send({ stars: 5, comment: "Sorted it instantly" })
      .expect(200);
    expect(rated.body.chat.ratingStars).toBe(5);
    expect(rated.body.chat.status).toBe("closed");

    // Rating is a one-time act.
    await agent
      .post(`/api/support/chats/${chat.id}/rating`)
      .send({ stars: 4 })
      .expect(409);
  });

  it("a poor rating raises it with a person instead of filing a metric", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    await say(agent, chat.id, "__resolved").expect(200);

    const before = await prisma.supportTicket.count();
    await agent
      .post(`/api/support/chats/${chat.id}/rating`)
      .send({ stars: 1, comment: "This did not help at all" })
      .expect(200);
    const after = await prisma.supportTicket.count();
    expect(after).toBe(before + 1);

    const updated = await prisma.supportChat.findUniqueOrThrow({ where: { id: chat.id } });
    expect(updated.ticketId).toBeTruthy();
  });

  it("rejects a star count outside 1 to 5", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    await agent.post(`/api/support/chats/${chat.id}/rating`).send({ stars: 0 }).expect(400);
    await agent.post(`/api/support/chats/${chat.id}/rating`).send({ stars: 6 }).expect(400);
  });

  it("a closed conversation takes no more messages", async () => {
    const { agent } = await authedAgent();
    const chat = await startChat(agent);
    await say(agent, chat.id, "__resolved").expect(200);
    await agent.post(`/api/support/chats/${chat.id}/rating`).send({ stars: 5 }).expect(200);
    await say(agent, chat.id, "one more thing").expect(409);
  });
});

describe("a conversation belongs to one account", () => {
  it("another account cannot read, message, end or rate it", async () => {
    const owner = await authedAgent();
    const attacker = await authedAgent();
    const chat = await startChat(owner.agent);

    await attacker.agent.get(`/api/support/chats/${chat.id}`).expect(404);
    await say(attacker.agent, chat.id, "hello").expect(404);
    await attacker.agent.post(`/api/support/chats/${chat.id}/end`).expect(404);
    await attacker.agent
      .post(`/api/support/chats/${chat.id}/rating`)
      .send({ stars: 1 })
      .expect(404);
  });

  it("an order can only be attached by the account that owns it", async () => {
    const owner = await authedAgent();
    const attacker = await authedAgent();
    const order = await owner.agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);

    await attacker.agent
      .post("/api/support/chats")
      .send({ orderId: order.body.order.id })
      .expect(404);
  });

  it("requires a session for anything conversational", async () => {
    await request(app).post("/api/support/chats").send({}).expect(401);
    await request(app).get("/api/support/chats").expect(401);
  });
});
