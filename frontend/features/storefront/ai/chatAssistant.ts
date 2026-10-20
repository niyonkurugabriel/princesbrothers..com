import type { AiProvider, AiResultMeta } from "@/features/ai/provider";
import { stubMeta } from "@/features/ai/provider";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatAssistantInput = { message: string; history?: ChatMessage[]; channel: "web" | "whatsapp" };
export type ChatAssistantOutput = { reply: string; suggestedActions: string[]; meta: AiResultMeta };

/** Provider contract for web/WhatsApp assistant orchestration. */
export type ChatAssistantProvider = AiProvider<ChatAssistantInput, ChatAssistantOutput>;

export class StubChatAssistantProvider implements ChatAssistantProvider {
  readonly name = "stub";
  readonly model = "commerce-assistant-v1";

  async run(input: ChatAssistantInput): Promise<ChatAssistantOutput> {
    const message = input.message.toLowerCase();
    const reply = message.includes("delivery") || message.includes("ship")
      ? "I can help with delivery questions. Share your order number and I will point you to tracking."
      : message.includes("return")
        ? "Returns are accepted within 30 days. I can help you find the right order next."
        : "I am the Princess & Brothers assistant stub. Ask me about products, orders, delivery, or returns.";
    return { reply, suggestedActions: ["Shop new arrivals", "Track an order", "Ask about returns"], meta: stubMeta(0.35) };
  }
}

export async function answerChat(input: ChatAssistantInput, provider: ChatAssistantProvider = new StubChatAssistantProvider()): Promise<ChatAssistantOutput> {
  return provider.run(input);
}