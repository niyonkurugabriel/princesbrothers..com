import { createHash } from "node:crypto";
import { execute, query, withTransaction } from "@princess-brothers/db";
import type { RowDataPacket } from "mysql2/promise";

const MAX_REQUESTS_PER_HOUR = 3;
const MAX_PASSWORD_RESET_REQUESTS_PER_MONTH = 4;
const RATE_WINDOW_MS = 60 * 60 * 1000;
let lastRateLimitCleanup = 0;

type RateLimitRow = RowDataPacket & { windowStartedAt: Date; requestCount: number };
type MonthlyLimitRow = RowDataPacket & { requestCount: number };
type RateLimitScope = { name: string; value: string };

export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizedEmailHash(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function currentUtcMonthStart(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export async function isPasswordResetMonthlyLimitReached(email: string): Promise<boolean> {
  const rows = await query<MonthlyLimitRow>(
    "SELECT requestCount FROM PasswordResetMonthlyLimit WHERE emailHash = ? AND monthStart = ? LIMIT 1",
    [normalizedEmailHash(email), currentUtcMonthStart()]
  );
  return (rows[0]?.requestCount ?? 0) >= MAX_PASSWORD_RESET_REQUESTS_PER_MONTH;
}

export async function reservePasswordResetMonthlyRequest(email: string): Promise<boolean> {
  const emailHash = normalizedEmailHash(email);
  const monthStart = currentUtcMonthStart();
  return withTransaction(async (transaction) => {
    await transaction.execute(
      "INSERT IGNORE INTO PasswordResetMonthlyLimit (emailHash, monthStart, requestCount) VALUES (?, ?, 0)",
      [emailHash, monthStart]
    );
    const [rows] = await transaction.execute(
      "SELECT requestCount FROM PasswordResetMonthlyLimit WHERE emailHash = ? AND monthStart = ? FOR UPDATE",
      [emailHash, monthStart]
    );
    const row = Array.isArray(rows) ? rows[0] as MonthlyLimitRow | undefined : undefined;
    if (!row || row.requestCount >= MAX_PASSWORD_RESET_REQUESTS_PER_MONTH) return false;

    await transaction.execute(
      "UPDATE PasswordResetMonthlyLimit SET requestCount = requestCount + 1 WHERE emailHash = ? AND monthStart = ?",
      [emailHash, monthStart]
    );
    await transaction.execute(
      "DELETE FROM PasswordResetMonthlyLimit WHERE monthStart < DATE_SUB(UTC_DATE(), INTERVAL 1 MONTH)"
    );
    return true;
  });
}

function rateLimitId(scope: RateLimitScope): string {
  return createHash("sha256").update(`${scope.name}:${scope.value}`).digest("hex");
}

export async function consumePasswordResetRateLimit(scopes: RateLimitScope[]): Promise<number | null> {
  const results = await Promise.all(scopes.map(async (scope) => {
    const id = rateLimitId(scope);
    await execute(
      "INSERT INTO AuthRateLimit (id, windowStartedAt, requestCount) VALUES (?, UTC_TIMESTAMP(3), 1) ON DUPLICATE KEY UPDATE requestCount = IF(windowStartedAt <= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 HOUR), 1, LEAST(requestCount + 1, 4)), windowStartedAt = IF(windowStartedAt <= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 HOUR), UTC_TIMESTAMP(3), windowStartedAt)",
      [id]
    );
    const rows = await query<RateLimitRow>("SELECT windowStartedAt, requestCount FROM AuthRateLimit WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];
    if (!row || row.requestCount <= MAX_REQUESTS_PER_HOUR) return null;
    return Math.max(1, Math.ceil((row.windowStartedAt.getTime() + RATE_WINDOW_MS - Date.now()) / 1000));
  }));

  const limited = results.filter((retryAfter): retryAfter is number => retryAfter !== null);
  if (limited.length) return Math.max(...limited);

  if (Date.now() - lastRateLimitCleanup >= RATE_WINDOW_MS) {
    await execute("DELETE FROM AuthRateLimit WHERE windowStartedAt < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 24 HOUR)");
    lastRateLimitCleanup = Date.now();
  }

  return null;
}
