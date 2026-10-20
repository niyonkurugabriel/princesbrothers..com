"use server";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { execute, query, withTransaction } from "@princess-brothers/db";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { hashAdminPassword } from "@/features/auth/admin-user";
import { expiredAuthCookie } from "@/features/auth/cookies";
import { logAuditEvent } from "@/shared/server/audit";
import { revokeSession } from "@/features/auth/session";
import { verifyActiveSession } from "@/features/auth/server";
import { approvePayment } from "@/features/payments/server/invoices";
import type { RowDataPacket } from "mysql2/promise";

type InventoryRow = RowDataPacket & { id: string; source: "INTERNAL" | "CONTRIBUTOR"; quantity: number; reserved: number };

async function adminActorId(requiredPermission?: string): Promise<string | undefined> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return undefined;
  try {
    const claims = await verifyActiveSession(token);
    if (!claims || claims.portal !== "admin" || !["password", "password-totp"].includes(claims.authMethod)) return undefined;
    if (requiredPermission && !claims.permissions.includes(requiredPermission)) return undefined;
    return claims.sub;
  } catch {
    return undefined;
  }
}

async function accountantActorId(requiredPermission: string): Promise<string | undefined> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return undefined;
  try {
    const claims = await verifyActiveSession(token);
    if (
      !claims ||
      claims.portal !== "admin" ||
      !["password", "password-totp"].includes(claims.authMethod) ||
      !claims.roles.includes("Accountant") ||
      !claims.permissions.includes("finance:read") ||
      !claims.permissions.includes(requiredPermission)
    ) return undefined;
    return claims.sub;
  } catch {
    return undefined;
  }
}

export async function createAccountantTransaction(input: {
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: string;
  transactionDate: string;
}) {
  const adminId = await accountantActorId("finance:write");
  if (!adminId) return { ok: false, error: "An Accountant admin session with finance:write permission is required." };
  if (
    !input ||
    typeof input.category !== "string" ||
    typeof input.description !== "string" ||
    typeof input.amount !== "string" ||
    typeof input.transactionDate !== "string"
  ) return { ok: false, error: "Enter valid transaction details." };
  const category = input.category.trim();
  const description = input.description.trim();
  const amountText = input.amount.trim();
  const date = input.transactionDate.trim();
  if (!["INCOME", "EXPENSE"].includes(input.type)) return { ok: false, error: "Choose income or expense." };
  if (!category || category.length > 100 || !description || description.length > 1000) return { ok: false, error: "Enter a category and description within the allowed lengths." };
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0 || Number(amountText) > 9999999999.99) return { ok: false, error: "Enter a positive amount with no more than two decimal places." };
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) return { ok: false, error: "Enter a valid transaction date." };

  try {
    await execute(
      "INSERT INTO FinanceTransaction (id, adminId, type, category, description, amount, transactionDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [randomUUID(), adminId, input.type, category, description, amountText, date, new Date()],
    );
  } catch (error) {
    console.error("Accountant transaction could not be saved.", error);
    return { ok: false, error: "The transaction could not be saved. Check the database connection and try again." };
  }
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function mutateAdmin(action: string, entityType: string, entityId: string, metadata?: unknown) {
  const permission = entityType === "Product" ? "catalog:write" : entityType === "Order" ? "orders:write" : entityType === "Contributor" ? "partners:review" : entityType === "Role" || entityType === "Session" ? "users:manage" : "audit:read";
  const actorId = await adminActorId(permission);
  if (!actorId) return { ok: false, error: `Admin session with ${permission} permission required.` };
  await logAuditEvent({ actorId, action, entityType, entityId, metadata });
  return { ok: true };
}

export async function revokeAdminSession(sessionId: string) {
  const result = await mutateAdmin("Revoked session", "Session", sessionId);
  if (!result.ok) return result;
  await revokeSession(sessionId);
  return { ok: true };
}

export async function createAdminAccount(input: { username: string; fullName: string; password: string; roleId: string }) {
  const actorId = await adminActorId("users:manage");
  if (!actorId) return { ok: false, error: "Admin session with users:manage permission required." };

  const username = input.username.trim();
  const fullName = input.fullName.trim();
  const password = input.password.trim();

  if (!username || username.length < 3 || username.length > 100) return { ok: false, error: "Choose a username between 3 and 100 characters." };
  if (!fullName || fullName.length > 150) return { ok: false, error: "Enter a full name for the admin account." };
  if (!password || password.length < 8) return { ok: false, error: "Admin password must be at least 8 characters long." };
  if (!input.roleId) return { ok: false, error: "Choose an admin role." };

  const existingRows = await query<RowDataPacket & { id: string }>("SELECT id FROM AdminUser WHERE username = ? LIMIT 1", [username]);
  if (existingRows.length) return { ok: false, error: "An admin account with that username already exists." };

  const roleRows = await query<RowDataPacket & { id: string; name: string }>("SELECT id, name FROM AdminRole WHERE id = ? LIMIT 1", [input.roleId]);
  const role = roleRows[0];
  if (!role) return { ok: false, error: "Choose a valid admin role." };

  const id = randomUUID();
  const now = new Date();
  const passwordHash = await hashAdminPassword(password);
  try {
    await execute("INSERT INTO AdminUser (id, username, passwordHash, fullName, isSuperAdmin, isActive, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)", [id, username, passwordHash, fullName, role.name === "Super admin" ? 1 : 0, role.id, now, now]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") return { ok: false, error: "An admin account with that username already exists." };
    return { ok: false, error: "Admin account could not be created. Check the database connection and selected role." };
  }

  const adminUser = { id, username, fullName, roleId: role.id, roleName: role.name, isSuperAdmin: role.name === "Super admin", isActive: true, createdAt: now.toISOString() };
  try { await logAuditEvent({ actorId, action: "Created admin account", entityType: "AdminUser", entityId: id, metadata: { username, fullName, role: role.name } }); } catch (error) { console.error("Admin account created, but audit logging failed.", error); }
  return { ok: true, adminUser };
}

export async function toggleAdminAccount(input: { id: string; isActive?: boolean; roleId?: string }) {
  const actorId = await adminActorId("users:manage");
  if (!actorId) return { ok: false, error: "Admin session with users:manage permission required." };
  if (input.id === actorId && input.isActive === false) return { ok: false, error: "You cannot deactivate your own admin account." };

  const targetRows = await query<RowDataPacket & { isActive: number; roleName: string | null }>("SELECT a.isActive, r.name AS roleName FROM AdminUser a LEFT JOIN AdminRole r ON r.id = a.roleId WHERE a.id = ? LIMIT 1", [input.id]);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "Admin account was not found." };
  const newRoleRows = input.roleId ? await query<RowDataPacket & { name: string }>("SELECT name FROM AdminRole WHERE id = ? LIMIT 1", [input.roleId]) : [];
  const newRoleName = input.roleId ? newRoleRows[0]?.name : target.roleName;
  if (input.roleId && !newRoleName) return { ok: false, error: "Choose a valid admin role." };
  const isLeavingSuperAdmin = target.roleName === "Super admin" && ((input.isActive === false && Boolean(target.isActive)) || (input.roleId !== undefined && newRoleName !== "Super admin"));
  if (isLeavingSuperAdmin) {
    const activeSuperAdmins = await query<RowDataPacket & { count: number }>("SELECT COUNT(*) AS count FROM AdminUser WHERE roleId = (SELECT id FROM AdminRole WHERE name = 'Super admin' LIMIT 1) AND isActive = 1");
    if (Number(activeSuperAdmins[0]?.count ?? 0) <= 1) return { ok: false, error: "The last active super admin cannot be demoted or deactivated." };
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  if (typeof input.isActive === "boolean") {
    updates.push("isActive = ?");
    values.push(input.isActive ? 1 : 0);
  }
  if (input.roleId) {
    const roleRows = await query<RowDataPacket & { id: string; name: string }>("SELECT id, name FROM AdminRole WHERE id = ? LIMIT 1", [input.roleId]);
    const role = roleRows[0];
    if (!role) return { ok: false, error: "Choose a valid admin role." };
    updates.push("roleId = ?", "isSuperAdmin = ?");
    values.push(role.id, role.name === "Super admin" ? 1 : 0);
  }
  if (!updates.length) return { ok: false, error: "No admin changes were requested." };

  values.push(new Date(), input.id);
  await execute(`UPDATE AdminUser SET ${updates.join(", ")}, updatedAt = ? WHERE id = ?`, values);

  await execute("UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'admin' AND revokedAt IS NULL", [new Date(), input.id]);
  const rows = await query<RowDataPacket & { id: string; username: string; fullName: string; roleId: string; roleName: string; isSuperAdmin: number; isActive: number; createdAt: Date }>("SELECT a.id, a.username, a.fullName, a.roleId, r.name AS roleName, a.isSuperAdmin, a.isActive, a.createdAt FROM AdminUser a LEFT JOIN AdminRole r ON r.id = a.roleId WHERE a.id = ? LIMIT 1", [input.id]);
  const row = rows[0];
  const adminUser = row ? { id: row.id, username: row.username, fullName: row.fullName, roleId: row.roleId, roleName: row.roleName ?? "Unassigned", isSuperAdmin: Boolean(row.isSuperAdmin), isActive: Boolean(row.isActive), createdAt: row.createdAt.toISOString() } : null;

  if (adminUser) {
    try { await logAuditEvent({ actorId, action: typeof input.isActive === "boolean" ? (input.isActive ? "Activated admin account" : "Deactivated admin account") : "Updated admin role", entityType: "AdminUser", entityId: input.id, metadata: { username: adminUser.username, role: adminUser.roleName, isActive: adminUser.isActive } }); } catch (error) { console.error("Admin account updated, but audit logging failed.", error); }
  }

  return { ok: true, adminUser };
}

export async function updateAdminAccount(input: { id: string; username: string; fullName: string; password?: string }) {
  const actorId = await adminActorId("users:manage");
  if (!actorId) return { ok: false, error: "Admin session with users:manage permission required." };
  const username = input.username.trim();
  const fullName = input.fullName.trim();
  const password = input.password?.trim() ?? "";
  if (!input.id || username.length < 3 || username.length > 100 || !fullName || fullName.length > 150) return { ok: false, error: "Enter a username between 3 and 100 characters and a full name." };
  if (password && password.length < 8) return { ok: false, error: "New admin password must be at least 8 characters." };
  const conflict = await query<RowDataPacket & { id: string }>("SELECT id FROM AdminUser WHERE username = ? AND id <> ? LIMIT 1", [username, input.id]);
  if (conflict.length) return { ok: false, error: "That username is already in use." };
  try {
    if (password) await execute("UPDATE AdminUser SET username = ?, fullName = ?, passwordHash = ?, updatedAt = ? WHERE id = ?", [username, fullName, await hashAdminPassword(password), new Date(), input.id]);
    else await execute("UPDATE AdminUser SET username = ?, fullName = ?, updatedAt = ? WHERE id = ?", [username, fullName, new Date(), input.id]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") return { ok: false, error: "That username is already in use." };
    return { ok: false, error: "Admin account could not be updated." };
  }
  await execute("UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'admin' AND revokedAt IS NULL", [new Date(), input.id]);
  try { await logAuditEvent({ actorId, action: "Updated admin account", entityType: "AdminUser", entityId: input.id, metadata: { username, fullName, passwordChanged: Boolean(password) } }); } catch (error) { console.error("Admin account updated, but audit logging failed.", error); }
  return { ok: true, adminUser: { id: input.id, username, fullName } };
}

export async function deleteAdminAccount(id: string) {
  const actorId = await adminActorId("users:manage");
  if (!actorId) return { ok: false, error: "Admin session with users:manage permission required." };
  if (!id || id === actorId) return { ok: false, error: "You cannot delete your own admin account." };

  const targets = await query<RowDataPacket & { username: string; roleName: string }>("SELECT a.username, r.name AS roleName FROM AdminUser a LEFT JOIN AdminRole r ON r.id = a.roleId WHERE a.id = ? LIMIT 1", [id]);
  const target = targets[0];
  if (!target) return { ok: false, error: "Admin account was not found." };
  if (target.roleName === "Super admin") {
    const activeSuperAdmins = await query<RowDataPacket & { count: number }>("SELECT COUNT(*) AS count FROM AdminUser WHERE roleId = (SELECT id FROM AdminRole WHERE name = 'Super admin' LIMIT 1) AND isActive = 1");
    if (Number(activeSuperAdmins[0]?.count ?? 0) <= 1) return { ok: false, error: "The last active super admin cannot be deleted." };
  }

  try {
    await withTransaction(async (transaction) => {
      await transaction.execute("UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'admin' AND revokedAt IS NULL", [new Date(), id]);
      await transaction.execute("DELETE FROM AdminUser WHERE id = ?", [id]);
    });
  } catch {
    return { ok: false, error: "Admin account could not be deleted. No changes were applied." };
  }
  try { await logAuditEvent({ actorId, action: "Deleted admin account", entityType: "AdminUser", entityId: id, metadata: { username: target.username, role: target.roleName } }); } catch (error) { console.error("Admin account deleted, but audit logging failed.", error); }
  return { ok: true };
}

const availableAdminPermissions = new Set(["catalog:read", "catalog:write", "orders:read", "orders:write", "partners:read", "partners:review", "users:manage", "audit:read", "finance:read", "finance:write"]);

export async function saveAdminRole(input: { id?: string; name: string; description: string; permissions: string[] }) {
  const actorId = await adminActorId("users:manage");
  if (!actorId) return { ok: false, error: "Admin session with users:manage permission required." };
  const name = input.name.trim();
  const description = input.description.trim();
  const permissions = [...new Set(input.permissions)].filter((permission) => availableAdminPermissions.has(permission));
  if (!name || name.length > 80 || description.length > 191 || !permissions.length) return { ok: false, error: "Enter a role name and select at least one valid permission." };

  try {
    if (input.id) {
      const existing = await query<RowDataPacket & { name: string; isSystem: number }>("SELECT name, isSystem FROM AdminRole WHERE id = ? LIMIT 1", [input.id]);
      if (!existing[0]) return { ok: false, error: "Admin role was not found." };
      if (existing[0].name === "Accountant") return { ok: false, error: "The Accountant system role and its private finance permissions cannot be changed." };
      if (existing[0].name === "Super admin" && (!permissions.includes("users:manage") || name !== "Super admin")) return { ok: false, error: "The Super admin role must retain its identity and account-management permission." };
      await execute("UPDATE AdminRole SET name = ?, description = ?, permissions = ?, updatedAt = ? WHERE id = ?", [name, description || null, JSON.stringify(permissions), new Date(), input.id]);
      await execute("UPDATE `Session` s JOIN AdminUser a ON a.id = s.userId SET s.revokedAt = ? WHERE a.roleId = ? AND s.portal = 'admin' AND s.revokedAt IS NULL", [new Date(), input.id]);
    } else {
      await execute("INSERT INTO AdminRole (id, name, description, permissions, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?)", [randomUUID(), name, description || null, JSON.stringify(permissions), new Date(), new Date()]);
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") return { ok: false, error: "An admin role with that name already exists." };
    return { ok: false, error: "Admin role could not be saved. Check the database connection." };
  }
  try { await logAuditEvent({ actorId, action: input.id ? "Updated admin role" : "Created admin role", entityType: "AdminRole", entityId: input.id ?? name, metadata: { name, permissions } }); } catch (error) { console.error("Admin role saved, but audit logging failed.", error); }
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function deleteAdminRole(id: string) {
  const actorId = await adminActorId("users:manage");
  if (!actorId) return { ok: false, error: "Admin session with users:manage permission required." };
  const rows = await query<RowDataPacket & { name: string; isSystem: number; members: number }>("SELECT r.name, r.isSystem, COUNT(a.id) AS members FROM AdminRole r LEFT JOIN AdminUser a ON a.roleId = r.id WHERE r.id = ? GROUP BY r.id, r.name, r.isSystem", [id]);
  const role = rows[0];
  if (!role) return { ok: false, error: "Admin role was not found." };
  if (role.isSystem || Number(role.members) > 0) return { ok: false, error: "System roles and roles assigned to admins cannot be deleted." };
  try { await execute("DELETE FROM AdminRole WHERE id = ?", [id]); } catch { return { ok: false, error: "Admin role could not be deleted." }; }
  try { await logAuditEvent({ actorId, action: "Deleted admin role", entityType: "AdminRole", entityId: id, metadata: { name: role.name } }); } catch (error) { console.error("Admin role deleted, but audit logging failed.", error); }
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function reviewAdminPartner(input: { id: string; status: "APPROVED" | "REJECTED"; message: string }) {
  const actorId = await adminActorId("partners:review");
  if (!actorId) return { ok: false, error: "Admin session with partners:review permission required." };
  const message = input.message.trim();
  if (!input.id || !["APPROVED", "REJECTED"].includes(input.status) || message.length > 4000) return { ok: false, error: "Check the partner decision and message." };

  try {
    await withTransaction(async (transaction) => {
      const [partnerRows] = await transaction.execute("SELECT id, userId FROM Contributor WHERE id = ? LIMIT 1", [input.id]);
      if (!Array.isArray(partnerRows) || partnerRows.length === 0) throw new Error("Partner application was not found.");
      const userId = (partnerRows[0] as { userId: string }).userId;
      await transaction.execute("UPDATE Contributor SET status = ?, updatedAt = ? WHERE id = ?", [input.status, new Date(), input.id]);
      await transaction.execute("UPDATE `User` SET status = ?, updatedAt = ? WHERE id = ?", [input.status === "APPROVED" ? "ACTIVE" : "SUSPENDED", new Date(), userId]);
      if (message) await transaction.execute("INSERT INTO PartnerAdminMessage (id, contributorId, senderAdminId, body, createdAt) VALUES (?, ?, ?, ?, ?)", [randomUUID(), input.id, actorId, message, new Date()]);
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Partner application could not be updated." };
  }

  try { await logAuditEvent({ actorId, action: input.status === "APPROVED" ? "Approved partner" : "Rejected partner", entityType: "Contributor", entityId: input.id, metadata: { messageIncluded: Boolean(message) } }); } catch (error) { console.error("Partner reviewed, but audit logging failed.", error); }
  revalidateTag("approved-contributors");
  revalidatePath("/admin/dashboard");
  revalidatePath("/partner/dashboard");
  return { ok: true };
}

export async function advanceAdminOrder(orderNumber: string) {
  const actorId = await adminActorId("orders:write");
  if (!actorId) return { ok: false, error: "Admin session with orders:write permission required." };
  const rows = await query<RowDataPacket & { id: string; status: string }>("SELECT id, status FROM `Order` WHERE orderNumber = ? LIMIT 1", [orderNumber]);
  const order = rows[0];
  if (!order) return { ok: false, error: "Order was not found." };

  const nextStatus: Record<string, string> = { PAID: "PROCESSING", PROCESSING: "READY_FOR_PICKUP", READY_FOR_PICKUP: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "COMPLETED" };
  const next = nextStatus[order.status];
  if (!next) return { ok: false, error: order.status === "PENDING_PAYMENT" ? "This order must be paid before fulfillment can begin." : "This order cannot be advanced further." };
  const result = await execute("UPDATE `Order` SET status = ?, updatedAt = ? WHERE id = ? AND status = ?", [next, new Date(), order.id, order.status]);
  if (result.affectedRows !== 1) return { ok: false, error: "The order changed while you were viewing it. Refresh and try again." };
  try { await logAuditEvent({ actorId, action: "Advanced order fulfillment", entityType: "Order", entityId: order.id, metadata: { orderNumber, from: order.status, to: next } }); } catch (error) { console.error("Order advanced, but audit logging failed.", error); }
  revalidatePath("/admin/dashboard");
  revalidatePath(`/orders/${orderNumber}`);
  return { ok: true, status: next };
}

export async function updateAdminProduct(formData: FormData) {
  const actorId = await adminActorId("catalog:write");
  if (!actorId) return { ok: false, error: "Admin session with catalog:write permission required." };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));
  const active = formData.get("active") === "on";
  const imageIsSafe = !imagePath || /^\/uploads\/products\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(imagePath);

  if (!id || !name || name.length > 200 || !categoryId) {
    return { ok: false, error: "Enter a product name and choose a category." };
  }
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || description.length > 5000 || imagePath.length > 512 || !imageIsSafe) {
    return { ok: false, error: "Check the FRW price, stock, description, and uploaded product image." };
  }

  try {
    await withTransaction(async (transaction) => {
      if (categoryId) {
        const [categoryRows] = await transaction.execute("SELECT id FROM Category WHERE id = ? LIMIT 1", [categoryId]);
        if (!Array.isArray(categoryRows) || categoryRows.length === 0) throw new Error("Choose a valid product category.");
      }
      await transaction.execute("UPDATE Product SET name = ?, description = ?, imagePath = ?, retailPrice = ?, currency = 'RWF', isActive = ?, updatedAt = ? WHERE id = ?", [name, description || null, imagePath || null, price, active, new Date(), id]);
      await transaction.execute("DELETE FROM ProductCategory WHERE productId = ?", [id]);
      if (categoryId) await transaction.execute("INSERT INTO ProductCategory (productId, categoryId) VALUES (?, ?)", [id, categoryId]);
      const [inventoryRows] = await transaction.execute("SELECT id, source, quantity, reserved FROM InventoryItem WHERE productId = ?", [id]);
      const inventory = inventoryRows as InventoryRow[];
      const reserved = inventory.reduce((total, item) => total + item.reserved, 0);
      const externalQuantity = inventory.filter((item) => item.source !== "INTERNAL").reduce((total, item) => total + item.quantity, 0);
      const internalItems = inventory.filter((item) => item.source === "INTERNAL");
      const internalQuantity = stock - externalQuantity;
      const otherInternalReserved = internalItems.slice(1).reduce((total, item) => total + item.reserved, 0);
      if (internalQuantity < internalItems.reduce((total, item) => total + item.reserved, 0) || stock < reserved) {
        throw new Error("Stock cannot be lower than reserved inventory.");
      }

      if (internalItems.length) {
        await transaction.execute("UPDATE InventoryItem SET quantity = ?, updatedAt = ? WHERE id = ?", [internalQuantity - otherInternalReserved, new Date(), internalItems[0].id]);
        for (const item of internalItems.slice(1)) {
          await transaction.execute("UPDATE InventoryItem SET quantity = ?, updatedAt = ? WHERE id = ?", [item.reserved, new Date(), item.id]);
        }
      } else if (internalQuantity > 0) {
        const now = new Date();
        await transaction.execute("INSERT INTO InventoryItem (id, productId, source, quantity, warehouseCode, createdAt, updatedAt) VALUES (?, ?, 'INTERNAL', ?, 'MAIN', ?, ?)", [randomUUID(), id, internalQuantity, now, now]);
      }
    });

    try { await logAuditEvent({
      actorId,
      action: "Updated product",
      entityType: "Product",
      entityId: id,
      metadata: { name, price, currency: "RWF", stock, active }
    }); } catch (error) { console.error("Product updated, but audit logging failed.", error); }
    revalidatePath("/");
    revalidatePath("/products");
    revalidateTag("catalog");
    revalidatePath("/products", "page");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Choose a valid product category.") return { ok: false, error: error.message };
    return { ok: false, error: "Product could not be saved. Check the product details and database connection." };
  }
}

export async function createAdminProduct(formData: FormData) {
  const actorId = await adminActorId("catalog:write");
  if (!actorId) return { ok: false, error: "Admin session with catalog:write permission required." };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));
  const active = formData.get("active") === "on";
  const imageIsSafe = !imagePath || /^\/uploads\/products\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(imagePath);
  if (!name || name.length > 200 || !categoryId) return { ok: false, error: "Enter a product name and choose a category." };
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || description.length > 5000 || imagePath.length > 512 || !imageIsSafe) return { ok: false, error: "Check FRW price, stock, description, and uploaded image." };

  const id = randomUUID();
  const now = new Date();
  let categoryName = "Uncategorized";
  try {
    await withTransaction(async (transaction) => {
      if (categoryId) {
        const [categoryRows] = await transaction.execute("SELECT id, name FROM Category WHERE id = ? LIMIT 1", [categoryId]);
        if (!Array.isArray(categoryRows) || categoryRows.length === 0) throw new Error("Choose a valid product category.");
        categoryName = (categoryRows as Array<{ name: string }>)[0].name;
      }
      await transaction.execute("INSERT INTO Product (id, name, description, imagePath, retailPrice, currency, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'RWF', ?, ?, ?)", [id, name, description || null, imagePath || null, price, active, now, now]);
      if (categoryId) await transaction.execute("INSERT INTO ProductCategory (productId, categoryId) VALUES (?, ?)", [id, categoryId]);
      if (stock > 0) await transaction.execute("INSERT INTO InventoryItem (id, productId, source, quantity, warehouseCode, createdAt, updatedAt) VALUES (?, ?, 'INTERNAL', ?, 'MAIN', ?, ?)", [randomUUID(), id, stock, now, now]);
    });
    try { await logAuditEvent({ actorId, action: "Created product", entityType: "Product", entityId: id, metadata: { name, price, currency: "RWF", stock, active } }); } catch (error) { console.error("Product created, but audit logging failed.", error); }
    revalidatePath("/");
    revalidateTag("catalog");
    revalidatePath("/products", "page");
    return { ok: true, product: { id, product: name, description, imagePath, price, active, categoryId, category: categoryName, location: "MAIN", driver: "Unassigned", stock, source: "Internal" as const } };
  } catch (error) {
    if (error instanceof Error && error.message === "Choose a valid product category.") return { ok: false, error: error.message };
    return { ok: false, error: "Product could not be saved. Check the product details and database connection." };
  }
}

export async function approveAdminPayment(orderNumber: string): Promise<{ ok: boolean; error?: string; invoiceSent?: boolean }> {
  const actorId = await adminActorId("orders:write");
  if (!actorId) return { ok: false, error: "Admin session with orders:write permission required." };
  const rows = await query<RowDataPacket & { id: string; status: string }>("SELECT p.id, p.status FROM Payment p JOIN `Order` o ON o.id = p.orderId WHERE o.orderNumber = ? ORDER BY p.createdAt DESC LIMIT 1", [orderNumber]);
  const payment = rows[0];
  if (!payment) return { ok: false, error: "Payment was not found for this order." };
  const result = await approvePayment(payment.id, actorId);
  if (result.ok) {
    revalidatePath("/admin/dashboard");
    revalidatePath(`/orders/${orderNumber}`);
  }
  return { ...result, error: result.invoiceSent === false ? "Payment approved, but invoice email delivery failed. Check the audit trail and email configuration." : result.error };
}

export async function assignAdminDriver(orderNumber: string, driverId: string) {
  const actorId = await adminActorId("orders:write");
  if (!actorId) return { ok: false, error: "Admin session with orders:write permission required." };
  if (!orderNumber || !driverId) return { ok: false, error: "Choose an order and active driver." };
  const orderRows = await query<RowDataPacket & { id: string; status: string; billingCity: string | null; billingState: string | null }>("SELECT o.id, o.status, ba.city AS billingCity, ba.state AS billingState FROM `Order` o LEFT JOIN Address ba ON ba.id = o.billingAddressId WHERE o.orderNumber = ? LIMIT 1", [orderNumber]);
  const order = orderRows[0];
  if (!order || order.status !== "READY_FOR_PICKUP") return { ok: false, error: "Only orders ready for pickup can be assigned to a driver." };
  if (!order.billingCity) return { ok: false, error: "This order has no billing location. Add a billing address before assigning a driver." };
  const driverRows = await query<RowDataPacket & { id: string; userId: string }>("SELECT d.id, d.userId FROM Driver d JOIN `User` u ON u.id = d.userId JOIN DriverLocation dl ON dl.driverId = d.id WHERE d.id = ? AND u.status = 'ACTIVE' AND (LOWER(TRIM(dl.locationName)) = LOWER(TRIM(?)) OR LOWER(TRIM(dl.locationName)) = LOWER(TRIM(CONCAT_WS(', ', ?, ?)))) LIMIT 1", [driverId, order.billingCity, order.billingCity, order.billingState]);
  if (!driverRows[0]) return { ok: false, error: "Choose an active driver whose service locations include the buyer's billing location." };
  const routeId = randomUUID();
  const now = new Date();
  try {
    await withTransaction(async (transaction) => {
      const [lockedRows] = await transaction.execute("SELECT status FROM `Order` WHERE id = ? FOR UPDATE", [order.id]);
      const lockedOrder = (lockedRows as (RowDataPacket & { status: string })[])[0];
      if (!lockedOrder || lockedOrder.status !== "READY_FOR_PICKUP") throw new Error("The order changed before it could be assigned.");
      await transaction.execute("INSERT INTO DeliveryRoute (id, driverId, routeDate, status, createdAt, updatedAt) VALUES (?, ?, CURRENT_DATE, 'PICKED_UP', ?, ?)", [routeId, driverId, now, now]);
      const [result] = await transaction.execute("UPDATE `Order` SET routeId = ?, status = 'OUT_FOR_DELIVERY', deliveryStatus = 'PICKED_UP', updatedAt = ? WHERE id = ? AND status = 'READY_FOR_PICKUP'", [routeId, now, order.id]);
      if (!("affectedRows" in result) || result.affectedRows !== 1) throw new Error("The order changed before it could be assigned.");
      await transaction.execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, 'Assigned order to driver', 'Order', ?, ?)", [randomUUID(), actorId, order.id, JSON.stringify({ orderNumber, driverId, routeId })]);
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The driver assignment could not be saved." };
  }
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function saveMomoPaymentCode(code: string) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "admin" || !claims.roles.includes("Super admin")) return { ok: false, error: "Only a super admin can change the MoMo payment code." };
  if (!/^[0-9*#]{1,32}$/.test(code)) return { ok: false, error: "Use digits, * or # only (up to 32 characters)." };
  await execute("INSERT INTO SystemSetting (settingKey, value, updatedAt) VALUES ('momo_payment_code', ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updatedAt = VALUES(updatedAt)", [code, new Date()]);
  await logAuditEvent({ actorId: claims.sub, action: "Updated MoMo payment code", entityType: "SystemSetting", entityId: "momo_payment_code" });
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function loadAdminPartnerMessages(contributorId: string) {
  const actorId = await adminActorId("partners:read");
  if (!actorId) return { ok: false, error: "Admin session with partners:read permission required.", messages: [] };
  const messages = await query<RowDataPacket & { id: string; body: string; createdAt: Date; sender: string; senderType: "ADMIN" | "CONTRIBUTOR"; messageType: "MESSAGE" | "REPORT"; attachmentUrl: string | null; attachmentName: string | null }>("SELECT m.id, m.body, m.createdAt, COALESCE(a.fullName, CONCAT(u.firstName, ' ', u.lastName), 'Princess & Brothers') AS sender, IF(m.senderUserId IS NULL, 'ADMIN', 'CONTRIBUTOR') AS senderType, m.messageType, m.attachmentUrl, m.attachmentName FROM PartnerAdminMessage m LEFT JOIN AdminUser a ON a.id = m.senderAdminId LEFT JOIN `User` u ON u.id = m.senderUserId WHERE m.contributorId = ? ORDER BY m.createdAt ASC LIMIT 100", [contributorId]);
  return { ok: true, messages: messages.map((message) => ({ ...message, createdAt: message.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) })) };
}

export async function sendAdminPartnerMessage(input: { contributorId: string; body: string; attachmentUrl?: string; attachmentName?: string }) {
  const actorId = await adminActorId("partners:review");
  if (!actorId) return { ok: false, error: "Admin session with partners:review permission required." };
  const body = input.body.trim();
  const attachmentUrl = input.attachmentUrl?.trim() ?? "";
  const attachmentName = input.attachmentName?.trim().slice(0, 255) ?? "";
  if ((!body && !attachmentUrl) || body.length > 4000 || (attachmentUrl && !attachmentUrl.startsWith("/api/contributor/chat-attachment/") && !/^https:\/\//i.test(attachmentUrl))) return { ok: false, error: "Write a message or attach a file/link." };
  const id = randomUUID();
  try {
    await withTransaction(async (transaction) => {
      await transaction.execute("INSERT INTO PartnerAdminMessage (id, contributorId, senderAdminId, senderUserId, messageType, body, attachmentUrl, attachmentName, createdAt) VALUES (?, ?, ?, NULL, 'MESSAGE', ?, ?, ?, ?)", [id, input.contributorId, actorId, body, attachmentUrl || null, attachmentName || null, new Date()]);
      await transaction.execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, 'Replied to contributor chat', 'PartnerAdminMessage', ?, ?)", [randomUUID(), actorId, id, JSON.stringify({ contributorId: input.contributorId, attachment: Boolean(attachmentUrl) })]);
    });
  } catch {
    return { ok: false, error: "The message could not be sent." };
  }
  revalidatePath("/admin/dashboard");
  revalidatePath("/partner/dashboard");
  return { ok: true };
}

export async function updateOwnAdminProfile(input: { username: string; fullName: string; profileImageUrl: string; currentPassword?: string; newPassword?: string }) {
  const actorId = await adminActorId();
  if (!actorId) return { ok: false, error: "An active admin session is required." };
  const username = input.username.trim();
  const fullName = input.fullName.trim();
  const profileImageUrl = input.profileImageUrl.trim();
  const currentPassword = input.currentPassword ?? "";
  const newPassword = input.newPassword ?? "";
  if (username.length < 3 || username.length > 100 || !fullName || fullName.length > 150) return { ok: false, error: "Enter a username between 3 and 100 characters and a full name." };
  if (profileImageUrl && !/^\/uploads\/admin-profiles\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(profileImageUrl)) return { ok: false, error: "Choose a valid profile image." };
  if (newPassword && (!currentPassword || newPassword.length < 12)) return { ok: false, error: "Enter your current password and choose a new password with at least 12 characters." };

  const currentRows = await query<RowDataPacket & { passwordHash: string }>("SELECT passwordHash FROM AdminUser WHERE id = ? AND isActive = 1 LIMIT 1", [actorId]);
  if (!currentRows[0]) return { ok: false, error: "Your active admin account was not found." };
  if (newPassword && !(await bcrypt.compare(currentPassword, currentRows[0].passwordHash))) return { ok: false, error: "Current password is incorrect." };
  const duplicate = await query<RowDataPacket & { id: string }>("SELECT id FROM AdminUser WHERE username = ? AND id <> ? LIMIT 1", [username, actorId]);
  if (duplicate.length) return { ok: false, error: "That username is already in use." };

  try {
    if (newPassword) await execute("UPDATE AdminUser SET username = ?, fullName = ?, profileImageUrl = ?, passwordHash = ?, updatedAt = ? WHERE id = ?", [username, fullName, profileImageUrl || null, await hashAdminPassword(newPassword), new Date(), actorId]);
    else await execute("UPDATE AdminUser SET username = ?, fullName = ?, profileImageUrl = ?, updatedAt = ? WHERE id = ?", [username, fullName, profileImageUrl || null, new Date(), actorId]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") return { ok: false, error: "That username is already in use." };
    return { ok: false, error: "Your profile could not be saved." };
  }

  await logAuditEvent({ actorId, action: "Updated own admin profile", entityType: "AdminUser", entityId: actorId, metadata: { username, profileImageChanged: true, passwordChanged: Boolean(newPassword) } });
  if (newPassword) {
    await execute("UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'admin' AND revokedAt IS NULL", [new Date(), actorId]);
    (await cookies()).set(expiredAuthCookie());
  }
  revalidatePath("/admin/dashboard");
  return { ok: true, profile: { username, fullName, profileImageUrl }, signedOut: Boolean(newPassword) };
}