import { NextResponse } from "next/server";
import { adviseWholesalePrice } from "@/features/contributor/ai/wholesaleAdvisor";

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input.retailPrice !== "number" || typeof input.currency !== "string") return NextResponse.json({ error: "retailPrice and currency are required." }, { status: 400 });
  return NextResponse.json(await adviseWholesalePrice(input));
}