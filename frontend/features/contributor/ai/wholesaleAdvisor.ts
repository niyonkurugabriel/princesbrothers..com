import type { AiProvider, AiResultMeta } from "@/features/ai/provider";
import { stubMeta } from "@/features/ai/provider";

export type WholesalePriceInput = { retailPrice: number; proposedWholesalePrice?: number; costPerUnit?: number; currency: string; category?: string; quantity?: number };
export type WholesalePriceOutput = { suggestedWholesalePrice: number; suggestedRetailRange: { min: number; max: number }; marginPercent: number; rationale: string; meta: AiResultMeta };

/** Provider contract for market-aware wholesale pricing advice. */
export type WholesalePriceProvider = AiProvider<WholesalePriceInput, WholesalePriceOutput>;

export class StubWholesalePriceProvider implements WholesalePriceProvider {
  readonly name = "stub";
  readonly model = "wholesale-advisor-v1";

  async run(input: WholesalePriceInput): Promise<WholesalePriceOutput> {
    const suggestedWholesalePrice = Number((input.retailPrice * 0.55).toFixed(2));
    const marginPercent = Math.round((1 - suggestedWholesalePrice / input.retailPrice) * 100);
    return { suggestedWholesalePrice, suggestedRetailRange: { min: Number((suggestedWholesalePrice * 1.7).toFixed(2)), max: Number((suggestedWholesalePrice * 2.1).toFixed(2)) }, marginPercent, rationale: "Stub recommendation uses a 55% wholesale-to-retail anchor; replace with category, cost, and demand features.", meta: stubMeta(0.25) };
  }
}

export async function adviseWholesalePrice(input: WholesalePriceInput, provider: WholesalePriceProvider = new StubWholesalePriceProvider()): Promise<WholesalePriceOutput> {
  return provider.run(input);
}