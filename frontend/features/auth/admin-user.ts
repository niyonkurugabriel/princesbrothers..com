import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const LEGACY_ADMIN_PASSWORD_SALT = "princesbrothers-admin-v1";

export function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyAdminPassword(password: string, passwordHash: string): Promise<boolean> {
  if (/^\$2[aby]\$/.test(passwordHash)) return bcrypt.compare(password, passwordHash);
  if (!/^[a-f\d]{64}$/i.test(passwordHash)) return false;

  const legacyHash = createHash("sha256").update(`${LEGACY_ADMIN_PASSWORD_SALT}:${password}`).digest();
  return timingSafeEqual(legacyHash, Buffer.from(passwordHash, "hex"));
}

export function isLegacyAdminPasswordHash(passwordHash: string): boolean {
  return /^[a-f\d]{64}$/i.test(passwordHash);
}

export function buildSuperAdminSession() {
  return {
    portal: "admin" as const,
    roles: ["Super admin"],
    permissions: [
      "catalog:read",
      "catalog:write",
      "orders:read",
      "orders:write",
      "partners:review",
      "users:manage",
      "audit:read",
    ],
  };
}
