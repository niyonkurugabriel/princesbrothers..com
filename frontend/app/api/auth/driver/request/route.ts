import { NextResponse } from "next/server";
import { requestPhoneOtp } from "@/features/auth/providers";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: unknown; purpose?: unknown } | null;
  if (!body || typeof body.phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(body.phone.trim())) return NextResponse.json({ error: "Enter a valid international phone number." }, { status: 400 });
  if (body.purpose !== "password-reset") return NextResponse.json({ error: "SMS codes are only available for PIN recovery." }, { status: 400 });
  try {
    await requestPhoneOtp(body.phone.trim(), "driver-password-reset");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not send an SMS. Please try again later." }, { status: 503 });
  }
}