export type AdminProduct = {
  id: string;
  product: string;
  sku: string;
  price: number;
  location: string;
  driver: string;
  stock: number;
  source: "Internal" | "Contributor";
};

export type AdminOrder = {
  id: string;
  customer: string;
  total: number;
  status: "Pending payment" | "Processing" | "Ready for pickup" | "Out for delivery" | "Completed";
  driver: string;
  placed: string;
};

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

export const adminProducts: AdminProduct[] = [
  { id: "prod-1", product: "The Sunday Knit Set", sku: "PB-001", price: 88, location: "Brooklyn · A1", driver: "Unassigned", stock: 12, source: "Internal" },
  { id: "prod-2", product: "Marigold Carryall", sku: "PB-002", price: 64, location: "Brooklyn · B2", driver: "James Carter", stock: 42, source: "Contributor" },
  { id: "prod-3", product: "Sunday Market Candle", sku: "PB-003", price: 32, location: "Queens · C4", driver: "Unassigned", stock: 24, source: "Internal" },
  { id: "prod-4", product: "Little Explorer Overalls", sku: "PB-004", price: 52, location: "Brooklyn · A3", driver: "Maya Lee", stock: 15, source: "Contributor" }
];

export const adminOrders: AdminOrder[] = [
  { id: "PB-10482", customer: "Maya Thompson", total: 88, status: "Out for delivery", driver: "James Carter", placed: "Today, 09:24" },
  { id: "PB-10481", customer: "Oliver Brown", total: 128, status: "Processing", driver: "Unassigned", placed: "Today, 08:52" },
  { id: "PB-10480", customer: "Sophia Williams", total: 64, status: "Ready for pickup", driver: "Maya Lee", placed: "Yesterday, 16:40" },
  { id: "PB-10479", customer: "Ethan Davis", total: 32, status: "Completed", driver: "James Carter", placed: "Yesterday, 14:12" },
  { id: "PB-10478", customer: "Isabella Wilson", total: 96, status: "Pending payment", driver: "Unassigned", placed: "Yesterday, 13:06" }
];

export const adminPartners: AdminPartner[] = [
  { id: "partner-1", company: "Moss & Thread Studio", contact: "Lena Ortiz", email: "hello@mossandthread.com", registrationNumber: "NY-884201", location: "Brooklyn, NY", details: "Small-batch textiles and naturally dyed home goods made in a family studio. Looking to start with 30-50 units per collection.", status: "PENDING", applied: "2 hours ago" },
  { id: "partner-2", company: "Field Note Objects", contact: "Sam Green", email: "sam@fieldnoteobjects.co", registrationNumber: "CA-118402", location: "Oakland, CA", details: "Hand-finished ceramic objects for slow mornings and thoughtful gifts.", status: "PENDING", applied: "Yesterday" },
  { id: "partner-3", company: "Juniper Kids", contact: "Nora Singh", email: "studio@juniperkids.com", registrationNumber: "NY-772190", location: "Queens, NY", details: "Playful, durable clothing for curious little lives.", status: "APPROVED", applied: "Sep 10" }
];

export const adminSessions: AdminSession[] = [
  { id: "session-1", user: "Alex Morgan", email: "alex@princesbrothers.com", portal: "Admin", lastSeen: "Just now", expires: "14 min" },
  { id: "session-2", user: "Priya Shah", email: "priya@princesbrothers.com", portal: "Admin", lastSeen: "4 min ago", expires: "11 min" },
  { id: "session-3", user: "James Carter", email: "james@example.com", portal: "Driver", lastSeen: "8 min ago", expires: "11 hr" }
];

export const adminAuditEvents = [
  { id: "audit-1", admin: "Alex Morgan", action: "Approved contributor", entity: "Moss & Thread Studio", date: "Sep 16, 2026 · 10:04" },
  { id: "audit-2", admin: "Priya Shah", action: "Updated order status", entity: "PB-10482", date: "Sep 16, 2026 · 09:42" },
  { id: "audit-3", admin: "Alex Morgan", action: "Revoked session", entity: "James Carter", date: "Sep 15, 2026 · 17:22" },
  { id: "audit-4", admin: "Priya Shah", action: "Changed role permission", entity: "Fulfillment manager", date: "Sep 15, 2026 · 15:08" }
];

export const adminRoles = [
  { id: "role-1", name: "Super admin", members: 2, permissions: ["catalog:read", "catalog:write", "orders:read", "orders:write", "partners:review", "users:manage", "audit:read"] },
  { id: "role-2", name: "Fulfillment manager", members: 3, permissions: ["catalog:read", "orders:read", "orders:write"] },
  { id: "role-3", name: "Partner success", members: 2, permissions: ["partners:review", "partners:read"] }
];

export const adminPermissionGroups = [
  { resource: "Catalog", permissions: ["catalog:read", "catalog:write"] },
  { resource: "Orders", permissions: ["orders:read", "orders:write"] },
  { resource: "Partners", permissions: ["partners:read", "partners:review"] },
  { resource: "Users", permissions: ["users:manage"] },
  { resource: "Audit trail", permissions: ["audit:read"] }
];