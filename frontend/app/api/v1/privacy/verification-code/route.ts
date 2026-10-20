import { createHash, createHmac, randomInt } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { execute } from "@princess-brothers/db";
import { sendEmail, sendSms } from "@/features/auth/providers";
import { consumePasswordResetRateLimit } from "@/features/auth/password-reset";

function normalizeContact(contact: string): { type: "email" | "phone"; value: string } | null {
  const value = contact.trim();
  if (/^\S+@\S+\.\S+$/.test(value) && value.length <= 255) return { type: "email", value: value.toLowerCase() };
  if (/^\+[1-9]\d{7,14}$/.test(value)) return { type: "phone", value };
  return null;
}

function challengeId(contact: string): string {
  return `pb:privacy:rights:${createHash("sha256").update(contact).digest("hex")}`;
}

function hashCode(id: string, code: string): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters.");
  return createHmac("sha256", secret).update(`${id}:${code}`).digest("hex");
}

function clientIp(request: Request): string {
  const candidate = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many verification requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { contact?: unknown } | null;
    if (!body || typeof body.contact !== "string") return NextResponse.json({ error: "Enter an email address or international phone number." }, { status: 400 });
    const contact = normalizeContact(body.contact);
    if (!contact) return NextResponse.json({ error: "Enter a valid email address or international phone number." }, { status: 400 });

    const retryAfter = await consumePasswordResetRateLimit([
      { name: "privacy-code-ip", value: clientIp(request) },
      { name: "privacy-code-contact", value: contact.value }
    ]);
    if (retryAfter !== null) return rateLimited(retryAfter);

    const id = challengeId(contact.value);
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await execute("DELETE FROM AuthChallenge WHERE expiresAt <= ?", [new Date()]);
    await execute(
      "INSERT INTO AuthChallenge (id, value, expiresAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), attempts = 0, expiresAt = VALUES(expiresAt)",
      [id, JSON.stringify({ codeHash: hashCode(id, code) }), expiresAt]
    );

    if (contact.type === "email") {
      await sendEmail(contact.value, "Verify your Princess & Brothers data-rights request", `Your verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this message.`);
    } else {
      await sendSms(contact.value, `Your Princess & Brothers data-rights verification code is ${code}. It expires in 10 minutes.`);
    }

    return NextResponse.json({ ok: true, message: `A verification code has been sent to your ${contact.type}.` });
  } catch (error) {
    console.error("Data-rights verification code could not be sent.", error);
    return NextResponse.json({ error: "A verification code could not be sent. Please try again later." }, { status: 503 });
  }
}
