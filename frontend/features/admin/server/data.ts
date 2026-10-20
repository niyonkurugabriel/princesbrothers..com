import { query } from "@princess-brothers/db";
import { convertAmount } from "@/features/payments/payment-context";
import type { RowDataPacket } from "mysql2/promise";

type ProductRow = RowDataPacket & {
  id: string; name: string; description: string | null; imagePath: string | null;
  retailPrice: number | string; currency: string; isActive: number | boolean; categoryId: string | null; categoryName: string | null;
  warehouseCode: string | null; quantity: number | null; source: "INTERNAL" | "CONTRIBUTOR" | null;
};

export type AdminProduct = {
  id: string;
  product: string;
  description: string;
  imagePath: string;
  price: number;
  active: boolean;
  categoryId: string;
  category: string;
  location: string;
  driver: string;
  stock: number;
  source: "Internal" | "Contributor";
};

export type AdminProductCategory = { id: string; name: string };

export async function getAdminProducts(): Promise<AdminProduct[]> {
  try {
    const rows = await query<ProductRow>("SELECT p.id, p.name, p.description, p.imagePath, p.retailPrice, p.currency, p.isActive, c.id AS categoryId, c.name AS categoryName, i.warehouseCode, i.quantity, i.source FROM Product p LEFT JOIN ProductCategory pc ON pc.productId = p.id LEFT JOIN Category c ON c.id = pc.categoryId LEFT JOIN InventoryItem i ON i.productId = p.id ORDER BY p.name ASC");
    const products = new Map<string, AdminProduct>();
    for (const row of rows) {
      const product = products.get(row.id) ?? {
        id: row.id, product: row.name, description: row.description ?? "", imagePath: row.imagePath ?? "",
        price: convertAmount(Number(row.retailPrice), row.currency as Parameters<typeof convertAmount>[1], "RWF"), active: Boolean(row.isActive), categoryId: row.categoryId ?? "", category: row.categoryName ?? "Uncategorized",
        location: "Main store", driver: "Unassigned", stock: 0, source: "Internal"
      };
      product.stock += row.quantity ?? 0;
      if (row.warehouseCode) product.location = row.warehouseCode;
      if (row.source === "CONTRIBUTOR") product.source = "Contributor";
      products.set(row.id, product);
    }
    return [...products.values()];
  } catch {
    return [];
  }
}

export async function getAdminProductCategories(): Promise<AdminProductCategory[]> {
  try {
    return await query<AdminProductCategory & RowDataPacket>("SELECT id, name FROM Category ORDER BY name ASC");
  } catch {
    return [];
  }
}

export type AdminOrder = {
  id: string;
  customer: string;
  billingLocation: string;
  total: number;
  status: "Pending payment" | "Paid - ready to process" | "Processing" | "Ready for pickup" | "Out for delivery" | "Completed" | "Cancelled" | "Refunded";
  driver: string;
  driverId: string;
  paymentId: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  placed: string;
};

export type AdminDriver = { id: string; name: string; phone: string; locations: string[] };

export type AdminPartner = {
  id: string;
  company: string;
  contact: string;
  email: string;
  registrationNumber: string;
  location: string;
  details: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  applied: string;
};

export type AdminSession = { id: string; user: string; email: string; portal: string; lastSeen: string; expires: string };
export type AdminRole = { id: string; name: string; description: string; members: number; permissions: string[]; isSystem: boolean };
export type AccountantTransaction = { id: string; type: "INCOME" | "EXPENSE"; category: string; description: string; amount: number; transactionDate: string };

const adminPermissionGroups = [
  { resource: "Catalog", permissions: ["catalog:read", "catalog:write"] },
  { resource: "Orders", permissions: ["orders:read", "orders:write"] },
  { resource: "Partners", permissions: ["partners:read", "partners:review"] },
  { resource: "Users", permissions: ["users:manage"] },
  { resource: "Audit trail", permissions: ["audit:read"] },
  { resource: "Finance", permissions: ["finance:read", "finance:write"] }
];

export { adminPermissionGroups };

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const rows = await query<RowDataPacket & { orderNumber: string; customer: string; billingLocation: string; total: number | string; currency: string; status: string; driver: string | null; driverId: string | null; paymentId: string | null; paymentStatus: string | null; paymentMethod: string | null; paymentReference: string | null; placedAt: Date | null; createdAt: Date }>("SELECT o.orderNumber, CONCAT(u.firstName, ' ', u.lastName) AS customer, COALESCE(NULLIF(CONCAT_WS(', ', ba.city, ba.state), ''), 'Billing address unavailable') AS billingLocation, o.total, o.currency, o.status, CONCAT(du.firstName, ' ', du.lastName) AS driver, d.id AS driverId, (SELECT p.id FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentId, (SELECT p.status FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentStatus, (SELECT p.paymentMethod FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentMethod, (SELECT p.gatewayTransactionId FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentReference, o.placedAt, o.createdAt FROM `Order` o JOIN Customer c ON c.id = o.customerId JOIN `User` u ON u.id = c.userId LEFT JOIN Address ba ON ba.id = o.billingAddressId LEFT JOIN DeliveryRoute dr ON dr.id = o.routeId LEFT JOIN Driver d ON d.id = dr.driverId LEFT JOIN `User` du ON du.id = d.userId ORDER BY o.createdAt DESC");
  const labels: Record<string, AdminOrder["status"]> = { PENDING_PAYMENT: "Pending payment", PAID: "Paid - ready to process", PROCESSING: "Processing", READY_FOR_PICKUP: "Ready for pickup", OUT_FOR_DELIVERY: "Out for delivery", COMPLETED: "Completed", CANCELLED: "Cancelled", REFUNDED: "Refunded" };
  return rows.map((row) => ({ id: row.orderNumber, customer: row.customer, billingLocation: row.billingLocation, total: convertAmount(Number(row.total), row.currency as Parameters<typeof convertAmount>[1], "RWF"), status: labels[row.status] ?? "Pending payment", driver: row.driver?.trim() || "Unassigned", driverId: row.driverId ?? "", paymentId: row.paymentId, paymentStatus: row.paymentStatus, paymentMethod: row.paymentMethod, paymentReference: row.paymentReference, placed: (row.placedAt ?? row.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }));
}

export async function getAdminDrivers(): Promise<AdminDriver[]> {
  const rows = await query<RowDataPacket & { id: string; name: string; phone: string | null; locationName: string | null }>("SELECT d.id, CONCAT(u.firstName, ' ', u.lastName) AS name, u.phone, dl.locationName FROM Driver d JOIN `User` u ON u.id = d.userId LEFT JOIN DriverLocation dl ON dl.driverId = d.id WHERE u.status = 'ACTIVE' ORDER BY u.firstName, u.lastName, dl.locationName");
  const drivers = new Map<string, AdminDriver>();
  for (const row of rows) {
    const driver = drivers.get(row.id) ?? { id: row.id, name: row.name, phone: row.phone ?? "", locations: [] };
    if (row.locationName) driver.locations.push(row.locationName);
    drivers.set(row.id, driver);
  }
  return [...drivers.values()];
}

export async function getMomoPaymentCode(): Promise<string> {
  const rows = await query<RowDataPacket & { value: string }>("SELECT value FROM SystemSetting WHERE settingKey = 'momo_payment_code' LIMIT 1");
  return rows[0]?.value ?? "";
}

export async function getAdminPartners(): Promise<AdminPartner[]> {
  const rows = await query<RowDataPacket & { id: string; companyName: string; contact: string; businessEmail: string; registrationNumber: string; location: string; businessDetails: string | null; status: AdminPartner["status"]; createdAt: Date }>("SELECT c.id, c.companyName, CONCAT(u.firstName, ' ', u.lastName) AS contact, c.businessEmail, c.registrationNumber, c.location, c.businessDetails, c.status, c.createdAt FROM Contributor c JOIN `User` u ON u.id = c.userId ORDER BY c.createdAt DESC");
  return rows.map((row) => ({ id: row.id, company: row.companyName, contact: row.contact, email: row.businessEmail, registrationNumber: row.registrationNumber, location: row.location, details: row.businessDetails ?? "", status: row.status, applied: row.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }));
}

export async function getAdminSessions(): Promise<AdminSession[]> {
  const rows = await query<RowDataPacket & { id: string; fullName: string | null; email: string | null; username: string | null; portal: string; lastSeenAt: Date; expiresAt: Date }>("SELECT s.id, COALESCE(NULLIF(CONCAT(u.firstName, ' ', u.lastName), ' '), a.fullName, 'Unknown user') AS fullName, u.email, a.username, s.portal, s.lastSeenAt, s.expiresAt FROM `Session` s LEFT JOIN `User` u ON u.id = s.userId LEFT JOIN AdminUser a ON a.id = s.userId WHERE s.revokedAt IS NULL AND s.expiresAt > NOW(3) ORDER BY s.lastSeenAt DESC");
  return rows.map((row) => ({ id: row.id, user: row.fullName ?? "Unknown user", email: row.email ?? row.username ?? "", portal: row.portal, lastSeen: row.lastSeenAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), expires: row.expiresAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }));
}

export async function getAdminAuditEvents() {
  const rows = await query<RowDataPacket & { id: string; admin: string | null; action: string; entityType: string; entityId: string; timestamp: Date }>("SELECT l.id, a.fullName AS admin, l.action, l.entityType, l.entityId, l.timestamp FROM AuditLog l LEFT JOIN AdminUser a ON a.id = l.actorId ORDER BY l.timestamp DESC LIMIT 200");
  return rows.map((row) => ({ id: row.id, admin: row.admin ?? "System", action: row.action, entity: `${row.entityType}: ${row.entityId}`, date: row.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) }));
}

export async function getAdminRoles(): Promise<AdminRole[]> {
  const rows = await query<RowDataPacket & { id: string; name: string; description: string | null; permissions: string; isSystem: number; members: number }>("SELECT r.id, r.name, r.description, r.permissions, r.isSystem, COUNT(a.id) AS members FROM AdminRole r LEFT JOIN AdminUser a ON a.roleId = r.id GROUP BY r.id, r.name, r.description, r.permissions, r.isSystem ORDER BY r.isSystem DESC, r.name ASC");
  return rows.map((row) => {
    let permissions: string[] = [];
    try {
      const parsed: unknown = JSON.parse(row.permissions);
      if (Array.isArray(parsed)) permissions = parsed.filter((permission): permission is string => typeof permission === "string");
    } catch {
      permissions = [];
    }
    return { id: row.id, name: row.name, description: row.description ?? "", members: Number(row.members), permissions, isSystem: Boolean(row.isSystem) };
  });
}

export async function getAccountantTransactions(adminId: string): Promise<AccountantTransaction[]> {
  const rows = await query<RowDataPacket & { id: string; type: AccountantTransaction["type"]; category: string; description: string; amount: number | string; transactionDate: string }>(
    "SELECT id, type, category, description, amount, DATE_FORMAT(transactionDate, '%Y-%m-%d') AS transactionDate FROM FinanceTransaction WHERE adminId = ? ORDER BY transactionDate DESC, createdAt DESC",
    [adminId],
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    transactionDate: row.transactionDate,
  }));
}