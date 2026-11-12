import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  query: vi.fn(),
  withTransaction: vi.fn(),
  verifyActiveSession: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock("@princess-brothers/db", () => ({
  execute: mocks.execute,
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session-token" }) }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("@/features/auth/config", () => ({ AUTH_COOKIE_NAME: "pb_session" }));
vi.mock("@/features/auth/server", () => ({ verifyActiveSession: mocks.verifyActiveSession }));
vi.mock("@/features/auth/admin-user", () => ({ hashAdminPassword: vi.fn() }));
vi.mock("@/features/auth/cookies", () => ({ expiredAuthCookie: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ revokeSession: vi.fn() }));
vi.mock("@/features/payments/server/invoices", () => ({ approvePayment: vi.fn() }));
vi.mock("@/shared/server/audit", () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { archiveAdminProduct, createAdminCategory } from "@/app/(admin)/actions";

describe("archiveAdminProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyActiveSession.mockResolvedValue({
      sub: "admin-id",
      portal: "admin",
      authMethod: "password",
      permissions: ["catalog:write"],
    });
    mocks.query.mockResolvedValue([]);
    mocks.execute.mockResolvedValue({ affectedRows: 1 });
    mocks.logAuditEvent.mockResolvedValue(undefined);
  });

  it("archives referenced products without deleting their history", async () => {
    const result = await archiveAdminProduct("f4f92db0-5d81-4c7a-8da5-d475f88e91e5");

    expect(result).toEqual({ ok: true });
    expect(mocks.execute).toHaveBeenCalledWith(
      "UPDATE Product SET isActive = 0, deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL",
      [expect.any(Date), expect.any(Date), "f4f92db0-5d81-4c7a-8da5-d475f88e91e5"],
    );
    expect(mocks.execute.mock.calls[0][0]).not.toMatch(/^DELETE/i);
  });

  it("rejects malformed IDs before touching the database", async () => {
    const result = await archiveAdminProduct("not-a-product-id");

    expect(result).toEqual({ ok: false, error: "Choose a valid product." });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("reports missing or already archived products", async () => {
    mocks.execute.mockResolvedValue({ affectedRows: 0 });

    const result = await archiveAdminProduct("f4f92db0-5d81-4c7a-8da5-d475f88e91e5");

    expect(result).toEqual({ ok: false, error: "Product was not found or has already been archived." });
  });

  it("prevents duplicate category creation before inserting", async () => {
    mocks.query.mockResolvedValue([{ id: "existing-category" }]);

    const result = await createAdminCategory({ name: "  fruit " });

    expect(result).toEqual({ ok: false, error: "A category with that name or slug already exists." });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
