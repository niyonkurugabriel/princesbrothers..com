import { resolveMx } from "node:dns/promises";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { execute, query, withTransaction } from "@princess-brothers/db";
import { sendEmail } from "@/features/auth/providers";
import {
  clientIp,
  consumePasswordResetRateLimit,
  hashPasswordResetToken,
  isPasswordResetMonthlyLimitReached,
  reservePasswordResetMonthlyRequest
} from "@/features/auth/password-reset";
import type { RowDataPacket } from "mysql2/promise";

type UserRow = RowDataPacket & { id: string; email: string };

const acceptedResponse = () => NextResponse.json({
  ok: true,
  message: "If this email matches an active account, a secure recovery link has been sent to your inbox. For security, you can only request this 4 times per month."
});

function rateLimited(retryAfter?: number) {
  return NextResponse.json(
    { error: "Rate limit exceeded. You can only request password recovery four times per month. Please try again next month or contact support." },
    { status: 429, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined }
  );
}

const EMAIL_PATTERN = /^(?=.{1,64}@)[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

async function domainCanReceiveMail(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records.some((record) => record.exchange !== ".");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error &&
      (error.code === "ENODATA" || error.code === "ENOTFOUND")) {
      return false;
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    if (!body || typeof body.email !== "string") {
      return NextResponse.json({ error: "The provided email format is invalid. Please check your spelling and try again." }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    if (await isPasswordResetMonthlyLimitReached(email)) return rateLimited();

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "The provided email format is invalid. Please check your spelling and try again." }, { status: 400 });
    }

    const ipRetryAfter = await consumePasswordResetRateLimit([{ name: "forgot-ip", value: clientIp(request) }]);
    if (ipRetryAfter !== null) return rateLimited(ipRetryAfter);

    if (!await domainCanReceiveMail(email.split("@")[1])) {
      return NextResponse.json({ error: "The email domain provided cannot receive mail. Recovery aborted." }, { status: 400 });
    }

    if (!await reservePasswordResetMonthlyRequest(email)) return rateLimited();

    const users = await query<UserRow>(
      "SELECT id, email FROM `User` WHERE email = ? AND status = 'ACTIVE' AND passwordHash IS NOT NULL LIMIT 1",
      [email]
    );
    const user = users[0];
    if (!user) return acceptedResponse();

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
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
        `We received a request to reset your password. Use this link within 15 minutes:\n\n${resetUrl.toString()}\n\nIf you did not request a password reset, you can ignore this email.`
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
