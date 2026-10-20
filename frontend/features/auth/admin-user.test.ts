import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { buildSuperAdminSession, hashAdminPassword, verifyAdminPassword } from "./admin-user";

describe("admin-user auth", () => {
  it("hashes and verifies admin credentials", async () => {
    const password = "test-only-strong-password";
    const hash = await hashAdminPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyAdminPassword(password, hash)).toBe(true);
    expect(await verifyAdminPassword("wrong-password", hash)).toBe(false);
  }, 60000);

  it("builds the super-admin session payload", () => {
    const session = buildSuperAdminSession();

    expect(session.portal).toBe("admin");
    expect(session.roles).toContain("Super admin");
    expect(session.permissions).toContain("users:manage");
  });

  it("verifies existing legacy hashes for upgrade on sign-in", async () => {
    const legacyHash = createHash("sha256").update("princesbrothers-admin-v1:legacy-test-password").digest("hex");

    expect(await verifyAdminPassword("legacy-test-password", legacyHash)).toBe(true);
    expect(await verifyAdminPassword("wrong-password", legacyHash)).toBe(false);
  });
});
