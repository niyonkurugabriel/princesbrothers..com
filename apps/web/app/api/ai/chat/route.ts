import { NextResponse } from "next/server";
import { answerChat, type ChatMessage } from "../../../../lib/ai/storefront/chatAssistant";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { message?: unknown; history?: unknown; channel?: unknown } | null;
  if (!body || typeof body.message !== "string" || !body.message.trim()) return NextResponse.json({ error: "A message is required." }, { status: 400 });
  const channel = body.channel === "whatsapp" ? "whatsapp" : "web";
  const history = Array.isArray(body.history) ? body.history as ChatMessage[] : [];
  return NextResponse.json(await answerChat({ message: body.message, history, channel }));
}