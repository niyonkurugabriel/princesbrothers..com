import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { limits } = vi.hoisted(() => ({
  limits: new Map<string, { windowStartedAt: Date; requestCount: number }>()
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
  query: vi.fn(async (_sql: string, parameters: unknown[] = []) => {
    const record = limits.get(parameters[0] as string);
    return record ? [{ ...record }] : [];
  })
}));

import { clientIp, consumePasswordResetRateLimit, hashPasswordResetToken } from "@/features/auth/password-reset";

describe("password reset protection", () => {
  beforeEach(() => {
    limits.clear();
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
});
