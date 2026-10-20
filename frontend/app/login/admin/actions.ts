"use server";

import { execute, query } from "@princess-brothers/db";
import { cookies } from "next/headers";
import { authCookie } from "@/features/auth/cookies";
import { hashAdminPassword, isLegacyAdminPasswordHash, verifyAdminPassword } from "@/features/auth/admin-user";
import { issueProviderSession } from "@/features/auth/providers";

export type AdminLoginState = { error?: string; success?: boolean };

type AdminUserRow = {
  id: string;
  username: string;
  passwordHash: string;
  isSuperAdmin: number | boolean;
  isActive: number | boolean;
  roleId: string | null;
};

type AdminRoleRow = { name: string; permissions: string };

export async function loginAdmin(_previous: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    const [adminUserRow] = (await query("SELECT id, username, passwordHash, isSuperAdmin, isActive, roleId FROM AdminUser WHERE username = ? AND isActive = 1 LIMIT 1", [username])) as [AdminUserRow | undefined];
    if (!adminUserRow || !await verifyAdminPassword(password, adminUserRow.passwordHash)) return { error: "Invalid admin credentials." };
    if (isLegacyAdminPasswordHash(adminUserRow.passwordHash)) {
      await execute("UPDATE AdminUser SET passwordHash = ?, updatedAt = ? WHERE id = ?", [await hashAdminPassword(password), new Date(), adminUserRow.id]);
    }

    const [adminRole] = (await query("SELECT name, permissions FROM AdminRole WHERE id = ? LIMIT 1", [adminUserRow.roleId])) as [AdminRoleRow | undefined];
    if (!adminRole) return { error: "This admin account has no assigned role. Ask a super admin to assign one." };
    let permissions: string[];
    try {
      const parsedPermissions: unknown = JSON.parse(adminRole.permissions);
      permissions = Array.isArray(parsedPermissions) ? parsedPermissions.filter((permission): permission is string => typeof permission === "string") : [];
    } catch {
      return { error: "This admin role has invalid permissions. Ask a super admin to review it." };
    }

    const session = await issueProviderSession({
      userId: adminUserRow.id,
      portal: "admin",
      authMethod: "password",
      roles: [adminRole.name],
      permissions,
    });

    (await cookies()).set(authCookie(session.token, 900));
    return { success: true };
  } catch {
    return { error: "Admin session storage is unavailable. Check the MySQL connection and try again." };
  }
}