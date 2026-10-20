import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "@princess-brothers/db";
import { clientIp, consumePasswordResetRateLimit, hashPasswordResetToken } from "@/features/auth/password-reset";
import type { RowDataPacket } from "mysql2/promise";

type ResetTokenRow = RowDataPacket & { userId: string; email: string };

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many password reset attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  try {
    const ipRetryAfter = await consumePasswordResetRateLimit([{ name: "reset-ip", value: clientIp(request) }]);
    if (ipRetryAfter !== null) return rateLimited(ipRetryAfter);

    const body = await request.json().catch(() => null) as { token?: unknown; password?: unknown } | null;
    if (!body || typeof body.token !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "A reset link and new password are required." }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(body.token)) {
      return NextResponse.json({ error: "This password reset link is invalid or expired. Request a new one." }, { status: 400 });
    }
    if (Buffer.byteLength(body.password, "utf8") < 8 || Buffer.byteLength(body.password, "utf8") > 72) {
      return NextResponse.json({ error: "Choose a password between 8 and 72 UTF-8 bytes." }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(body.token);
    const tokenRetryAfter = await consumePasswordResetRateLimit([{ name: "reset-token", value: tokenHash }]);
    if (tokenRetryAfter !== null) return rateLimited(tokenRetryAfter);

    const tokens = await query<ResetTokenRow>(
      "SELECT token.userId, user.email FROM PasswordResetToken token JOIN `User` user ON user.id = token.userId WHERE token.tokenHash = ? AND token.consumedAt IS NULL AND token.expiresAt > UTC_TIMESTAMP(3) AND user.status = 'ACTIVE' LIMIT 1",
      [tokenHash]
    );
    const resetToken = tokens[0];
    if (!resetToken) {
      return NextResponse.json({ error: "This password reset link is invalid or expired. Request a new one." }, { status: 400 });
    }

    const emailRetryAfter = await consumePasswordResetRateLimit([{ name: "reset-email", value: resetToken.email }]);
    if (emailRetryAfter !== null) return rateLimited(emailRetryAfter);

    const passwordHash = await bcrypt.hash(body.password, 12);
    await withTransaction(async (transaction) => {
      const [tokenRows] = await transaction.execute(
        "SELECT userId FROM PasswordResetToken WHERE tokenHash = ? AND consumedAt IS NULL AND expiresAt > UTC_TIMESTAMP(3) FOR UPDATE",
        [tokenHash]
      );
      const currentToken = Array.isArray(tokenRows) ? tokenRows[0] as { userId: string } | undefined : undefined;
      if (!currentToken || currentToken.userId !== resetToken.userId) {
        throw new Error("Password reset token was already used or expired.");
      }

      const now = new Date();
      const [updatedUser] = await transaction.execute(
        "UPDATE `User` SET passwordHash = ?, updatedAt = ? WHERE id = ? AND status = 'ACTIVE'",
        [passwordHash, now, resetToken.userId]
      );
      if (!("affectedRows" in updatedUser) || updatedUser.affectedRows !== 1) {
        throw new Error("Password reset token was already used or expired.");
      }
      const [consumed] = await transaction.execute(
        "UPDATE PasswordResetToken SET consumedAt = ? WHERE tokenHash = ? AND userId = ? AND consumedAt IS NULL AND expiresAt > UTC_TIMESTAMP(3)",
        [now, tokenHash, resetToken.userId]
      );
      if (!("affectedRows" in consumed) || consumed.affectedRows !== 1) {
        throw new Error("Password reset token was already used or expired.");
      }
      await transaction.execute(
        "UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'storefront' AND revokedAt IS NULL",
        [now, resetToken.userId]
      );
    });

    return NextResponse.json({ ok: true, message: "Your password has been reset. Sign in with your new password." });
  } catch (error) {
    if (error instanceof Error && error.message === "Password reset token was already used or expired.") {
      return NextResponse.json({ error: "This password reset link is invalid or expired. Request a new one." }, { status: 400 });
    }
    console.error("Password reset could not be completed.", error);
    return NextResponse.json({ error: "Password reset is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
