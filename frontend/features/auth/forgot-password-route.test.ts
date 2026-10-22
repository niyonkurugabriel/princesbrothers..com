import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveMx: vi.fn(),
  sendEmail: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
  transactionExecute: vi.fn(),
  consumeRateLimit: vi.fn(),
  isMonthlyLimitReached: vi.fn(),
  reserveMonthlyRequest: vi.fn()
}));

vi.mock("node:dns/promises", () => ({ resolveMx: mocks.resolveMx }));
vi.mock("@princess-brothers/db", () => ({
  execute: mocks.execute,
  query: mocks.query,
  withTransaction: vi.fn(async (work: (transaction: { execute: typeof mocks.transactionExecute }) => Promise<unknown>) =>
    work({ execute: mocks.transactionExecute }))
}));
vi.mock("@/features/auth/providers", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/features/auth/password-reset", () => ({
  clientIp: vi.fn(() => "203.0.113.7"),
  consumePasswordResetRateLimit: mocks.consumeRateLimit,
  hashPasswordResetToken: vi.fn((token: string) => `hash-${token}`),
  isPasswordResetMonthlyLimitReached: mocks.isMonthlyLimitReached,
  reservePasswordResetMonthlyRequest: mocks.reserveMonthlyRequest
}));

import { POST } from "@/app/api/auth/forgot-password/route";

function request(email: unknown) {
  return new Request("https://princesbrothers.com/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

describe("forgot-password route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00.000Z"));
    vi.clearAllMocks();
    mocks.resolveMx.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.query.mockImplementation(async (sql: string) =>
      sql.includes("SELECT id, email") ? [{ id: "user-1", email: "buyer@example.com" }] : []);
    mocks.execute.mockResolvedValue({ affectedRows: 1 });
    mocks.transactionExecute.mockResolvedValue({ affectedRows: 1 });
    mocks.consumeRateLimit.mockResolvedValue(null);
    mocks.isMonthlyLimitReached.mockResolvedValue(false);
    mocks.reserveMonthlyRequest.mockResolvedValue(true);
    vi.stubEnv("APP_URL", "https://princesbrothers.com");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("rejects monthly-limit exhaustion before validating the email or looking up DNS", async () => {
    mocks.isMonthlyLimitReached.mockResolvedValue(true);

    const response = await POST(request("invalid"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("Rate limit exceeded. You can only request password recovery four times per month. Please try again next month or contact support.");
    expect(mocks.resolveMx).not.toHaveBeenCalled();
  });

  it("rejects malformed email addresses without an MX lookup", async () => {
    const response = await POST(request("not-an-email"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("The provided email format is invalid. Please check your spelling and try again.");
    expect(mocks.resolveMx).not.toHaveBeenCalled();
  });

  it("rejects domains without MX records", async () => {
    mocks.resolveMx.mockResolvedValue([]);

    const response = await POST(request("buyer@example.com"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("The email domain provided cannot receive mail. Recovery aborted.");
    expect(mocks.reserveMonthlyRequest).not.toHaveBeenCalled();
  });

  it("sends a 15-minute reset link without exposing its token in the response", async () => {
    const response = await POST(request("buyer@example.com"));
    const body = await response.json();
    const insert = mocks.transactionExecute.mock.calls.find(([sql]) =>
      String(sql).startsWith("INSERT INTO PasswordResetToken"));
    const expiresAt = insert?.[1]?.[2];

    expect(response.status).toBe(200);
    expect(body.message).toContain("4 times per month");
    expect(JSON.stringify(body)).not.toContain("token=");
    expect(expiresAt).toEqual(new Date("2026-10-22T12:15:00.000Z"));
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });
});
