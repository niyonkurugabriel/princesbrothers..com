import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { execute, query, withTransaction } from "@princess-brothers/db";
import { sendEmail } from "@/features/auth/providers";
import { clientIp, consumePasswordResetRateLimit, hashPasswordResetToken } from "@/features/auth/password-reset";
import type { RowDataPacket } from "mysql2/promise";

type UserRow = RowDataPacket & { id: string; email: string };

const acceptedResponse = () => NextResponse.json({
  ok: true,
  message: "If an active account uses that email, password reset instructions will arrive shortly."
});

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many password reset requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  try {
    const ipRetryAfter = await consumePasswordResetRateLimit([{ name: "forgot-ip", value: clientIp(request) }]);
    if (ipRetryAfter !== null) return rateLimited(ipRetryAfter);

    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    if (!body || typeof body.email !== "string") {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    if (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const emailRetryAfter = await consumePasswordResetRateLimit([{ name: "forgot-email", value: email }]);
    if (emailRetryAfter !== null) return rateLimited(emailRetryAfter);

    const users = await query<UserRow>(
      "SELECT id, email FROM `User` WHERE email = ? AND status = 'ACTIVE' AND passwordHash IS NOT NULL LIMIT 1",
      [email]
    );
    const user = users[0];
    if (!user) return acceptedResponse();

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await withTransaction(async (transaction) => {
      await transaction.execute(
        "UPDATE PasswordResetToken SET consumedAt = UTC_TIMESTAMP(3) WHERE userId = ? AND consumedAt IS NULL",
        [user.id]
      );
      await transaction.execute(
        "DELETE FROM PasswordResetToken WHERE expiresAt <= UTC_TIMESTAMP(3) OR consumedAt <= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 24 HOUR)"
      );
      await transaction.execute(
        "INSERT INTO PasswordResetToken (tokenHash, userId, expiresAt) VALUES (?, ?, ?)",
        [tokenHash, user.id, expiresAt]
      );
    });

    try {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL is required to create password reset links.");
      const resetUrl = new URL("/reset-password", appUrl);
      resetUrl.searchParams.set("token", token);
      await sendEmail(
        user.email,
        "Reset your Princess & Brothers password",
        `We received a request to reset your password. Use this link within 30 minutes:\n\n${resetUrl.toString()}\n\nIf you did not request a password reset, you can ignore this email.`
      );
    } catch (error) {
      await execute(
        "UPDATE PasswordResetToken SET consumedAt = UTC_TIMESTAMP(3) WHERE tokenHash = ? AND consumedAt IS NULL",
        [tokenHash]
      );
      console.error("Password reset email delivery failed.", error);
    }

    return acceptedResponse();
  } catch (error) {
    console.error("Password reset request could not be processed.", error);
    return NextResponse.json({ error: "Password reset is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
