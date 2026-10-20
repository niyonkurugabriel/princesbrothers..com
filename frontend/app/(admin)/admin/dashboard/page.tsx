import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@princess-brothers/db";
import { AdminDashboard } from "@/features/admin/components/dashboard";
import { AccountantDashboard } from "@/features/admin/components/accountant-dashboard";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { adminPermissionGroups, getAccountantTransactions, getAdminAuditEvents, getAdminDrivers, getAdminOrders, getAdminPartners, getAdminProductCategories, getAdminProducts, getAdminRoles, getAdminSessions, getMomoPaymentCode } from "@/features/admin/server/data";

async function getAdminUsers() {
  const rows = (await query("SELECT a.id, a.username, a.fullName, a.roleId, r.name AS roleName, a.isSuperAdmin, a.isActive, a.createdAt FROM AdminUser a LEFT JOIN AdminRole r ON r.id = a.roleId ORDER BY a.createdAt DESC")) as Array<{ id: string; username: string; fullName: string; roleId: string; roleName: string | null; isSuperAdmin: number; isActive: number; createdAt: Date }>;
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    roleId: row.roleId,
    roleName: row.roleName ?? "Unassigned",
    isSuperAdmin: Boolean(row.isSuperAdmin),
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt.toISOString(),
  }));
}

async function getCurrentAdmin(id: string) {
  const rows = (await query("SELECT id, username, fullName, profileImageUrl FROM AdminUser WHERE id = ? AND isActive = 1 LIMIT 1", [id])) as Array<{ id: string; username: string; fullName: string; profileImageUrl: string | null }>;
  const admin = rows[0];
  return admin ? { ...admin, profileImageUrl: admin.profileImageUrl ?? "" } : null;
}

export default async function AdminDashboardPage() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  let claims = null;
  if (token) {
    try {
      claims = await verifyActiveSession(token);
    } catch {
      claims = null;
    }
  }
  if (!claims || claims.portal !== "admin" || !["password", "password-totp"].includes(claims.authMethod)) {
    redirect("/login/admin?returnTo=/admin/dashboard");
  }

  if (claims.roles.includes("Accountant")) {
    if (!claims.permissions.includes("finance:read") || !claims.permissions.includes("finance:write")) {
      redirect("/login/admin?returnTo=/admin/dashboard");
    }
    const [adminRows, transactions] = await Promise.all([
      query("SELECT id, username, fullName FROM AdminUser WHERE id = ? AND isActive = 1 LIMIT 1", [claims.sub]) as Promise<Array<{ id: string; username: string; fullName: string }>>,
      getAccountantTransactions(claims.sub),
    ]);
    const admin = adminRows[0];
    if (!admin) redirect("/login/admin?returnTo=/admin/dashboard");
    return <AccountantDashboard profile={{ fullName: admin.fullName, username: admin.username }} transactions={transactions} />;
  }

  const [products, categories, adminUsers, orders, partners, roles, sessions, auditEvents, drivers, momoPaymentCode, currentAdmin] = await Promise.all([getAdminProducts(), getAdminProductCategories(), getAdminUsers(), getAdminOrders(), getAdminPartners(), getAdminRoles(), getAdminSessions(), getAdminAuditEvents(), getAdminDrivers(), getMomoPaymentCode(), getCurrentAdmin(claims.sub)]);
  if (!currentAdmin) redirect("/login/admin?returnTo=/admin/dashboard");
  return <AdminDashboard data={{ products, categories, orders, partners, roles, permissionGroups: adminPermissionGroups, auditEvents, sessions, adminUsers, drivers, momoPaymentCode, currentAdmin, isSuperAdmin: claims.roles.includes("Super admin") }} />;
}