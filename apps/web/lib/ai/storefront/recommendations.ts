import type { AiProvider, AiResultMeta } from "../provider";
import { normalizeTokens, stubMeta } from "../provider";

export type RecommendationProduct = { id: string; name: string; category: string; description?: string; price: number };
export type RecommendationInput = { cart: RecommendationProduct[]; candidates: RecommendationProduct[]; limit?: number };
export type RecommendationOutput = { products: RecommendationProduct[]; reasons: Record<string, string>; meta: AiResultMeta };

/** Provider contract for personalized or basket-aware recommendations. */
export type RecommendationProvider = AiProvider<RecommendationInput, RecommendationOutput>;

export class StubRecommendationProvider implements RecommendationProvider {
  readonly name = "stub";
  readonly model = "basket-affinity-v1";

  async run(input: RecommendationInput): Promise<RecommendationOutput> {
    const categories = new Set(input.cart.map((item) => item.category));
    const cartWords = normalizeTokens(input.cart.map((item) => item.description ?? item.name).join(" "));
    const products = input.candidates.filter((candidate) => !input.cart.some((item) => item.id === candidate.id)).map((candidate) => {
      const affinity = categories.has(candidate.category) ? 2 : normalizeTokens(candidate.description ?? candidate.name).filter((word) => cartWords.includes(word)).length;
      return { candidate, affinity };
    }).sort((a, b) => b.affinity - a.affinity).slice(0, input.limit ?? 4).map(({ candidate }) => candidate);
    return { products, reasons: Object.fromEntries(products.map((product) => [product.id, categories.has(product.category) ? "Complements your current edit" : "A similar thoughtful find"])), meta: stubMeta(0.4) };
  }
}

export async function getCrossSellRecommendations(input: RecommendationInput, provider: RecommendationProvider = new StubRecommendationProvider()): Promise<RecommendationOutput> {
  return provider.run(input);
}