import { describe, expect, it } from "vitest";
import { hasPermission, permissionKey } from "@/features/auth/permissions";

describe("auth permissions", () => {
  it("builds stable permission keys", () => {
    expect(permissionKey("read", "users")).toBe("users:read");
  });

  it("accepts matching exact permissions", () => {
    const user = { permissions: ["users:read", "orders:write"] };

    expect(hasPermission(user, "read", "users")).toBe(true);
    expect(hasPermission(user, "write", "orders")).toBe(true);
    expect(hasPermission(user, "delete", "users")).toBe(false);
  });

  it("supports wildcard permissions", () => {
    const user = { permissions: ["*:users", "*:*"] };

    expect(hasPermission(user, "approve", "users")).toBe(true);
    expect(hasPermission(user, "manage", "orders")).toBe(true);
  });

  it("rejects missing or empty user permissions", () => {
    expect(hasPermission(null, "read", "users")).toBe(false);
    expect(hasPermission({ permissions: [] }, "read", "users")).toBe(false);
    expect(hasPermission({ permissions: ["users:read"] }, "", "users")).toBe(false);
  });
});
