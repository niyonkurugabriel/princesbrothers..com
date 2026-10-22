import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { limits, monthlyLimits } = vi.hoisted(() => ({
  limits: new Map<string, { windowStartedAt: Date; requestCount: number }>(),
  monthlyLimits: new Map<string, number>()
}));

vi.mock("@princess-brothers/db", () => ({
  execute: vi.fn(async (sql: string, parameters: unknown[] = []) => {
    if (!sql.startsWith("INSERT INTO AuthRateLimit")) return { affectedRows: 0 };
    const id = parameters[0] as string;
    const current = limits.get(id);
    if (!current || Date.now() - current.windowStartedAt.getTime() >= 60 * 60 * 1000) {
      limits.set(id, { windowStartedAt: new Date(), requestCount: 1 });
    } else {
      current.requestCount = Math.min(current.requestCount + 1, 4);
    }
    return { affectedRows: 1 };
  }),
  query: vi.fn(async (sql: string, parameters: unknown[] = []) => {
    if (sql.includes("PasswordResetMonthlyLimit")) {
      const key = `${parameters[0]}:${parameters[1]}`;
      const requestCount = monthlyLimits.get(key);
      return requestCount === undefined ? [] : [{ requestCount }];
    }
    const record = limits.get(parameters[0] as string);
    return record ? [{ ...record }] : [];
  }),
  withTransaction: vi.fn(async (work: (transaction: { execute: (sql: string, parameters?: unknown[]) => Promise<unknown> }) => Promise<unknown>) => {
    const transaction = {
      execute: vi.fn(async (sql: string, parameters: unknown[] = []) => {
        const key = `${parameters[0]}:${parameters[1]}`;
        if (sql.startsWith("INSERT IGNORE INTO PasswordResetMonthlyLimit")) {
          if (!monthlyLimits.has(key)) monthlyLimits.set(key, 0);
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("SELECT requestCount FROM PasswordResetMonthlyLimit")) {
          return [[{ requestCount: monthlyLimits.get(key) ?? 0 }]];
        }
        if (sql.startsWith("UPDATE PasswordResetMonthlyLimit")) {
          monthlyLimits.set(key, (monthlyLimits.get(key) ?? 0) + 1);
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      })
    };
    return work(transaction);
  })
}));

import {
  clientIp,
  consumePasswordResetRateLimit,
  hashPasswordResetToken,
  isPasswordResetMonthlyLimitReached,
  reservePasswordResetMonthlyRequest
} from "@/features/auth/password-reset";

describe("password reset protection", () => {
  beforeEach(() => {
    limits.clear();
    monthlyLimits.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts the client IP from proxy headers", () => {
    expect(clientIp(new Request("https://example.test", { headers: { "x-real-ip": "203.0.113.8", "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }))).toBe("203.0.113.8");
    expect(clientIp(new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }))).toBe("203.0.113.9");
    expect(clientIp(new Request("https://example.test"))).toBe("unknown");
  });

  it("stores reset tokens as irreversible SHA-256 digests", () => {
    const token = "a".repeat(43);
    const digest = hashPasswordResetToken(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(token);
  });

  it("allows three requests per scope and blocks the fourth for the remaining hour", async () => {
    const scope = [{ name: "forgot-email", value: "buyer@example.com" }];
    expect(await consumePasswordResetRateLimit(scope)).toBeNull();
    expect(await consumePasswordResetRateLimit(scope)).toBeNull();
    expect(await consumePasswordResetRateLimit(scope)).toBeNull();
    const retryAfter = await consumePasswordResetRateLimit(scope);
    expect(retryAfter).toBe(3600);
    expect(await consumePasswordResetRateLimit(scope)).toBe(3600);
  });

  it("starts a fresh rate window after one hour", async () => {
    const scope = [{ name: "reset-ip", value: "203.0.113.8" }];
    for (let request = 0; request < 3; request += 1) await consumePasswordResetRateLimit(scope);
    expect(await consumePasswordResetRateLimit(scope)).not.toBeNull();

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    expect(await consumePasswordResetRateLimit(scope)).toBeNull();
  });

  it("allows at most four email recovery requests per UTC calendar month", async () => {
    const email = "buyer@example.com";
    expect(await isPasswordResetMonthlyLimitReached(email)).toBe(false);
    for (let request = 0; request < 4; request += 1) {
      expect(await reservePasswordResetMonthlyRequest(email)).toBe(true);
    }
    expect(await isPasswordResetMonthlyLimitReached(email)).toBe(true);
    expect(await reservePasswordResetMonthlyRequest(email)).toBe(false);

    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    expect(await isPasswordResetMonthlyLimitReached(email)).toBe(false);
    expect(await reservePasswordResetMonthlyRequest(email)).toBe(true);
  });
});
