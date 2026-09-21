import { NextResponse } from "next/server";
import { getProducts } from "../../../../lib/storefront/data";
import { semanticProductSearch } from "../../../../lib/ai/storefront/semanticSearch";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { query?: unknown; limit?: unknown } | null;
  if (!body || typeof body.query !== "string" || !body.query.trim()) return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  const products = await getProducts();
  return NextResponse.json(await semanticProductSearch({ query: body.query, limit: typeof body.limit === "number" ? body.limit : 10, products }));
}