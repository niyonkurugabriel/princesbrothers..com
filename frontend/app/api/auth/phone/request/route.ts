import { NextResponse } from "next/server";
import { requestPhoneOtp } from "@/features/auth/providers";
import { clientIp, consumePasswordResetRateLimit } from "@/features/auth/password-reset";

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many password reset requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  try {
    const ipRetryAfter = await consumePasswordResetRateLimit([{ name: "recovery-phone-ip", value: clientIp(request) }]);
    if (ipRetryAfter !== null) return rateLimited(ipRetryAfter);

    const body = await request.json().catch(() => null) as { phone?: unknown; purpose?: unknown } | null;
    if (!body || typeof body.phone !== "string") return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    const phone = body.phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: "Use a valid international phone number." }, { status: 400 });
    if (body.purpose !== "password-reset") return NextResponse.json({ error: "Verification codes are only available for password recovery." }, { status: 400 });

    const phoneRetryAfter = await consumePasswordResetRateLimit([{ name: "recovery-phone-number", value: phone }]);
    if (phoneRetryAfter !== null) return rateLimited(phoneRetryAfter);

    await requestPhoneOtp(phone, "password-reset");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password recovery code could not be sent.", error);
    return NextResponse.json({ error: "Could not send a recovery code. Try again later." }, { status: 503 });
  }
}