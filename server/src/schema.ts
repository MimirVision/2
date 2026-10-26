import { z } from "zod";

/** What the app sends to POST /v1/analyze. */
export const AnalyzeRequest = z.object({
  // JPEG, already downscaled by the app (~1280px). ~2 MB of base64 is plenty.
  image: z.string().min(100).max(2_800_000),
  // BCP-47-ish language code the listings should be written in ("nb", "en", "sv", ...).
  language: z.string().min(2).max(12),
  // ISO 4217 currency for prices ("NOK", "USD", ...).
  currency: z.string().length(3),
  // ISO 3166 country code, decides which marketplaces/price levels apply.
  country: z.string().length(2),
  marketplaces: z.array(z.string().min(1).max(40)).min(1).max(5),
  // Optional free-text from the user ("size M, used twice").
  notes: z.string().max(500).optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

/** Structured output Claude must return. Mirrored in app/src/lib/types.ts. */
export const Appraisal = z.object({
  identified: z
    .boolean()
    .describe("false if the photo does not show a sellable item or is too unclear to appraise"),
  title: z.string().describe("Short name of the item, e.g. 'Nike Air Max 90, white, EU 42'"),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  category: z.string(),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]),
  conditionNotes: z.string().describe("Visible wear, damage or missing parts"),
  confidence: z.number().describe("0-1, how sure you are about identification and price"),
  price: z.object({
    low: z.number(),
    typical: z.number().describe("Most likely selling price in a normal timeframe"),
    high: z.number(),
    quickSale: z.number().describe("Price that sells within a few days"),
  }),
  demand: z.enum(["high", "medium", "low"]),
  daysToSell: z.number().describe("Typical days to sell at the typical price"),
  priceReasoning: z.string().describe("1-3 sentences on what drives the price"),
  tips: z.array(z.string()).describe("2-4 concrete tips to sell faster or for more"),
  authenticityChecks: z
    .array(z.string())
    .describe("What a buyer/seller should check to verify authenticity; empty if not relevant"),
  searchQuery: z.string().describe("Best search phrase to find comparable listings"),
  listings: z.array(
    z.object({
      marketplace: z.string(),
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
    }),
  ),
});
export type Appraisal = z.infer<typeof Appraisal>;
