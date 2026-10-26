import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { decide } from "../src/access";
import { sanitize } from "../src/appraise";
import { handle, type Env } from "../src/index";
import type { Appraisal } from "../src/schema";

function memoryKV() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => void store.set(k, v),
  } as unknown as KVNamespace & { store: Map<string, string> };
}

function env(): Env {
  return {
    QUOTA: memoryKV(),
    REVENUECAT_SECRET_KEY: "sk_test",
    ENTITLEMENT_ID: "pro",
    FREE_SCANS: "1",
    PRO_DAILY_LIMIT: "2",
    ANTHROPIC_API_KEY: "test",
  };
}

function mockRevenueCat(active: boolean) {
  const expires = active ? "2099-01-01T00:00:00Z" : "2000-01-01T00:00:00Z";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ subscriber: { entitlements: { pro: { expires_date: expires } } } })),
  );
}

const USER = "$RCAnonymousID:0123456789abcdef0123456789abcdef";

const appraisal: Appraisal = {
  identified: true,
  title: "Fjällräven Kånken, red",
  brand: "Fjällräven",
  model: "Kånken",
  category: "Bags",
  condition: "good",
  conditionNotes: "Light wear on straps",
  confidence: 0.9,
  price: { low: 350, typical: 450, high: 550, quickSale: 300 },
  demand: "high",
  daysToSell: 5,
  priceReasoning: "Popular classic.",
  tips: ["Wash it first"],
  authenticityChecks: ["Check the fox logo stitching"],
  searchQuery: "fjällräven kånken",
  listings: [{ marketplace: "Finn.no", title: "Kånken", description: "Pent brukt", tags: [] }],
};

function fakeClient(output: Appraisal | null, stop_reason = "end_turn") {
  const parse = vi.fn(async () => ({ stop_reason, parsed_output: output }));
  return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

function analyzeRequest(body: unknown, userId: string | null = USER) {
  const headers: Record<string, string> = { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" };
  if (userId) headers["x-app-user-id"] = userId;
  return new Request("https://api.test/v1/analyze", { method: "POST", headers, body: JSON.stringify(body) });
}

const validBody = {
  image: "a".repeat(200),
  language: "nb",
  currency: "NOK",
  country: "NO",
  marketplaces: ["Finn.no", "Tise"],
};

afterEach(() => vi.unstubAllGlobals());

describe("sanitize", () => {
  it("orders the price range and clamps junk", () => {
    const out = sanitize({
      ...appraisal,
      confidence: 3,
      daysToSell: -2,
      price: { low: 900, typical: 500.4, high: -1, quickSale: 9999 },
    });
    expect(out.price).toEqual({ low: 0, typical: 500, high: 900, quickSale: 500 });
    expect(out.confidence).toBe(1);
    expect(out.daysToSell).toBe(0);
  });
});

describe("decide", () => {
  it("gives a free user FREE_SCANS scans, then the paywall", async () => {
    mockRevenueCat(false);
    const e = env();
    const first = await decide(e, USER, "1.1.1.1");
    expect(first.allowed).toBe(true);
    if (first.allowed) await first.commit();
    // Entitlement cache must not hide the quota.
    expect(await decide(e, USER, "1.1.1.1")).toEqual({ allowed: false, reason: "paywall" });
  });

  it("caps free scans per IP even with fresh user ids", async () => {
    mockRevenueCat(false);
    const e = env();
    for (let i = 0; i < 5; i++) {
      const d = await decide(e, `${USER}${i}`, "9.9.9.9");
      expect(d.allowed).toBe(true);
      if (d.allowed) await d.commit();
    }
    expect(await decide(e, `${USER}x`, "9.9.9.9")).toEqual({ allowed: false, reason: "paywall" });
  });

  it("lets a user through right after they subscribe", async () => {
    const e = env();
    mockRevenueCat(false);
    const first = await decide(e, USER, "1.1.1.1");
    if (first.allowed) await first.commit();
    expect(await decide(e, USER, "1.1.1.1")).toEqual({ allowed: false, reason: "paywall" });
    mockRevenueCat(true);
    expect(await decide(e, USER, "1.1.1.1")).toMatchObject({ allowed: true, pro: true });
  });

  it("lets subscribers scan up to the daily limit", async () => {
    mockRevenueCat(true);
    const e = env();
    for (let i = 0; i < 2; i++) {
      const d = await decide(e, USER, "1.1.1.1");
      expect(d).toMatchObject({ allowed: true, pro: true });
      if (d.allowed) await d.commit();
    }
    expect(await decide(e, USER, "1.1.1.1")).toEqual({ allowed: false, reason: "daily_limit" });
  });
});

describe("handle", () => {
  it("rejects requests without a valid user id", async () => {
    const res = await handle(analyzeRequest(validBody, null), env());
    expect(res.status).toBe(401);
  });

  it("rejects malformed bodies", async () => {
    const res = await handle(analyzeRequest({ ...validBody, currency: "NORWEGIAN" }), env());
    expect(res.status).toBe(400);
  });

  it("returns the appraisal and counts the scan", async () => {
    mockRevenueCat(false);
    const e = env();
    const { client, parse } = fakeClient(appraisal);
    const res = await handle(analyzeRequest(validBody), e, client);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ appraisal: { title: appraisal.title }, pro: false });
    expect(parse).toHaveBeenCalledOnce();

    const again = await handle(analyzeRequest(validBody), e, client);
    expect(again.status).toBe(402);
    expect(await again.json()).toEqual({ error: "paywall" });
  });

  it("does not charge a free scan for an unidentifiable photo", async () => {
    mockRevenueCat(false);
    const e = env();
    const { client } = fakeClient({ ...appraisal, identified: false });
    expect((await handle(analyzeRequest(validBody), e, client)).status).toBe(200);
    expect((await handle(analyzeRequest(validBody), e, client)).status).toBe(200);
  });

  it("maps a refusal to 422", async () => {
    mockRevenueCat(true);
    const { client } = fakeClient(null, "refusal");
    const res = await handle(analyzeRequest(validBody), env(), client);
    expect(res.status).toBe(422);
  });
});
