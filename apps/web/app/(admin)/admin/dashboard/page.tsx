import { AdminDashboard } from "../../../../components/admin/dashboard";
import { adminAuditEvents, adminOrders, adminPartners, adminPermissionGroups, adminProducts, adminRoles, adminSessions } from "../../../../lib/admin/data";

export default function AdminDashboardPage() {
  return <AdminDashboard data={{ products: adminProducts, orders: adminOrders, partners: adminPartners, roles: adminRoles, permissionGroups: adminPermissionGroups, auditEvents: adminAuditEvents, sessions: adminSessions }} />;
}