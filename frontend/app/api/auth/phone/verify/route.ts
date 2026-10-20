import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { execute, query } from "@princess-brothers/db";
import { verifyPhoneOtp } from "@/features/auth/providers";
import { clientIp, consumePasswordResetRateLimit } from "@/features/auth/password-reset";
import type { RowDataPacket } from "mysql2/promise";

type UserRow = RowDataPacket & { id: string; status: string };

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many password reset attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { phone?: unknown; code?: unknown; purpose?: unknown; password?: unknown } | null;
    if (!body || typeof body.phone !== "string" || typeof body.code !== "string" || body.purpose !== "password-reset") return NextResponse.json({ error: "Phone, recovery code, and password recovery purpose are required." }, { status: 400 });
    const phone = body.phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: "Use a valid international phone number." }, { status: 400 });
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) return NextResponse.json({ error: "Choose a password with at least 8 characters." }, { status: 400 });

    const retryAfter = await consumePasswordResetRateLimit([
      { name: "recovery-verify-ip", value: clientIp(request) },
      { name: "recovery-verify-phone", value: phone }
    ]);
    if (retryAfter !== null) return rateLimited(retryAfter);

    const verified = await verifyPhoneOtp(phone, body.code, "password-reset");
    if (!verified) return NextResponse.json({ error: "That verification code is incorrect or expired." }, { status: 401 });

    const users = await query<UserRow>("SELECT id, status FROM `User` WHERE phone = ? LIMIT 1", [phone]);
    const user = users[0];
    if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "No active account is linked to this phone number." }, { status: 404 });
    await execute("UPDATE `User` SET passwordHash = ?, updatedAt = ? WHERE id = ?", [await bcrypt.hash(password, 12), new Date(), user.id]);
    await execute("UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'storefront' AND revokedAt IS NULL", [new Date(), user.id]);
    return NextResponse.json({ verified: true, passwordReset: true });
  } catch (error) {
    console.error("Password recovery could not be completed.", error);
    return NextResponse.json({ error: "Password recovery is temporarily unavailable. Try again later." }, { status: 503 });
  }
}