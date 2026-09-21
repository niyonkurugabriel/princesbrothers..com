import type { AiProvider, AiResultMeta } from "../provider";
import { normalizeTokens, stubMeta } from "../provider";

export type SemanticSearchProduct = { id: string; name: string; description?: string; category?: string; price?: number };
export type SemanticSearchInput = { query: string; products: SemanticSearchProduct[]; limit?: number };
export type SemanticSearchHit = SemanticSearchProduct & { score: number; matchedTerms: string[] };
export type SemanticSearchOutput = { hits: SemanticSearchHit[]; meta: AiResultMeta };

/** Provider contract for embedding/vector search. Replace without changing callers. */
export type SemanticSearchProvider = AiProvider<SemanticSearchInput, SemanticSearchOutput>;

export class StubSemanticSearchProvider implements SemanticSearchProvider {
  readonly name = "stub";
  readonly model = "token-overlap-v1";

  async run(input: SemanticSearchInput): Promise<SemanticSearchOutput> {
    const queryTokens = normalizeTokens(input.query);
    const hits = input.products.map((product) => {
      const searchable = normalizeTokens([product.name, product.description, product.category].filter(Boolean).join(" "));
      const matchedTerms = [...new Set(queryTokens.filter((token) => searchable.includes(token)))];
      return { ...product, score: queryTokens.length ? matchedTerms.length / queryTokens.length : 0, matchedTerms };
    }).filter((product) => product.score > 0).sort((a, b) => b.score - a.score).slice(0, input.limit ?? 10);
    return { hits, meta: stubMeta(hits.length ? Math.min(0.95, 0.5 + hits[0].score / 2) : 0.2) };
  }
}

export async function semanticProductSearch(input: SemanticSearchInput, provider: SemanticSearchProvider = new StubSemanticSearchProvider()): Promise<SemanticSearchOutput> {
  return provider.run(input);
}