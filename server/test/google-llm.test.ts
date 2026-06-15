import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleProvider } from "../src/modules/chat/llm/google.js";

// The Gemini adapter is exercised with a mocked fetch so it needs no real key
// or network — we verify it builds the right request and parses the response
// into our locked intent schema.

afterEach(() => {
  vi.restoreAllMocks();
});

function mockGemini(jsonText: string) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: jsonText }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

describe("Google (Gemini) LLM adapter", () => {
  it("parses a food intent from the model response", async () => {
    mockGemini(
      JSON.stringify({
        domain: "food",
        reply: "Finding you a great pizza!",
        food: { item: "pizza", budgetPaise: 30000, dietary: "veg" },
      }),
    );
    const intent = await new GoogleProvider().extractIntent("order a veg pizza under 300");
    expect(intent.domain).toBe("food");
    expect(intent.food?.item).toBe("pizza");
    expect(intent.food?.dietary).toBe("veg");
  });

  it("calls the Gemini generateContent endpoint with JSON mode", async () => {
    const spy = mockGemini(
      JSON.stringify({ domain: "greeting", reply: "Hi! How can I help?" }),
    );
    await new GoogleProvider().extractIntent("hello");

    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toContain("generativelanguage.googleapis.com");
    expect(String(url)).toContain(":generateContent");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.contents[0].parts[0].text).toBe("hello");
  });

  it("throws when the model returns no content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    await expect(new GoogleProvider().extractIntent("hi")).rejects.toThrow(
      /no content/i,
    );
  });

  it("throws on a non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 429 }),
    );
    await expect(new GoogleProvider().extractIntent("hi")).rejects.toThrow(
      /failed \(429\)/,
    );
  });
});
