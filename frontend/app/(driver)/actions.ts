"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { query, withTransaction } from "@princess-brothers/db";
import { authCookie } from "@/features/auth/cookies";
import { AUTH_COOKIE_NAME, defaultTtlFor } from "@/features/auth/config";
import { createSession } from "@/features/auth/session";
import { verifyActiveSession } from "@/features/auth/server";
import { logAuditEvent } from "@/shared/server/audit";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

type DriverUserRow = RowDataPacket & { id: string; pinHash: string | null };
type DriverAccessRow = RowDataPacket & { roleName: string; permissionKey: string | null };

export type DriverLoginState = { error?: string; success?: boolean };

type DriverAccess = { id: string; userId: string };
type DriverDeliveryStatus = "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";

async function getCurrentDriver(): Promise<{ driver: DriverAccess; userId: string } | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const claims = await verifyActiveSession(token);
  if (!claims || claims.portal !== "driver" || claims.authMethod !== "driver-pin") return null;
  const rows = await query<RowDataPacket & DriverAccess>(
    "SELECT id, userId FROM Driver WHERE userId = ? LIMIT 1",
    [claims.sub],
  );
  return rows[0] ? { driver: rows[0], userId: claims.sub } : null;
}

export async function saveDriverSettings(input: {
  vehicleInfo: string;
  locations: string[];
  payoutAccounts: { provider: string; accountHolder: string; accountPhone: string }[];
}) {
  const current = await getCurrentDriver();
  if (!current) return { ok: false, error: "Sign in to update your driver settings." };
  if (!input || typeof input.vehicleInfo !== "string" || !Array.isArray(input.locations) ||
      input.locations.some((location) => typeof location !== "string") ||
      !Array.isArray(input.payoutAccounts) ||
      input.payoutAccounts.some((account) => !account || typeof account.provider !== "string" ||
        typeof account.accountHolder !== "string" || typeof account.accountPhone !== "string")) {
    return { ok: false, error: "Driver settings contain invalid values." };
  }
  const vehicleInfo = input.vehicleInfo.trim();
  const locations = input.locations.map((location) => location.trim()).filter(Boolean);
  const payoutAccounts = input.payoutAccounts.map((account) => ({
    provider: account.provider.trim(),
    accountHolder: account.accountHolder.trim(),
    accountPhone: account.accountPhone.trim(),
  }));

  if (vehicleInfo.length > 191) return { ok: false, error: "Vehicle details must be 191 characters or fewer." };
  if (!locations.length || locations.some((location) => location.length > 160)) {
    return { ok: false, error: "Add at least one service location (up to 160 characters each)." };
  }
  if (new Set(locations.map((location) => location.toLocaleLowerCase())).size !== locations.length) {
    return { ok: false, error: "Remove duplicate service locations." };
  }
  if (payoutAccounts.some((account) =>
    !account.provider || account.provider.length > 100 ||
    !account.accountHolder || account.accountHolder.length > 150 ||
    !/^\+?[0-9][0-9\s()-]{6,30}$/.test(account.accountPhone)
  )) {
    return { ok: false, error: "Check each payout provider, account name, and phone number." };
  }
  if (payoutAccounts.length > 5) return { ok: false, error: "You can save up to five payout accounts." };

  const now = new Date();
  try {
    await withTransaction(async (transaction) => {
      await transaction.execute("UPDATE Driver SET vehicleInfo = ?, updatedAt = ? WHERE id = ?", [vehicleInfo || null, now, current.driver.id]);
      await transaction.execute("DELETE FROM DriverLocation WHERE driverId = ?", [current.driver.id]);
      await transaction.execute("DELETE FROM DriverPayoutAccount WHERE driverId = ?", [current.driver.id]);
      for (const location of locations) {
        await transaction.execute(
          "INSERT INTO DriverLocation (id, driverId, locationName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
          [randomUUID(), current.driver.id, location, now, now],
        );
      }
      for (const account of payoutAccounts) {
        await transaction.execute(
          "INSERT INTO DriverPayoutAccount (id, driverId, provider, accountHolder, accountPhone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [randomUUID(), current.driver.id, account.provider, account.accountHolder, account.accountPhone, now, now],
        );
      }
    });
  } catch {
    return { ok: false, error: "Driver settings could not be saved. Try again shortly." };
  }

  try {
    await logAuditEvent({
      actorId: current.userId,
      action: "Updated driver settings",
      entityType: "Driver",
      entityId: current.driver.id,
      metadata: { locations: locations.length, payoutAccounts: payoutAccounts.length },
    });
  } catch (error) {
    console.error("Driver settings were saved, but audit logging failed.", error);
  }
  revalidatePath("/driver");
  return { ok: true };
}

export async function updateDriverDeliveryStatus(orderId: string, status: DriverDeliveryStatus) {
  const current = await getCurrentDriver();
  if (!current) return { ok: false, error: "Sign in to update a delivery." };
  if (typeof orderId !== "string" || !orderId || !["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(status)) {
    return { ok: false, error: "Choose a valid delivery status." };
  }

  try {
    await withTransaction(async (transaction) => {
      const [orderRows] = await transaction.execute(
        "SELECT o.id, o.routeId, o.deliveryStatus FROM `Order` o JOIN DeliveryRoute dr ON dr.id = o.routeId JOIN Driver d ON d.id = dr.driverId WHERE o.id = ? AND d.id = ? FOR UPDATE",
        [orderId, current.driver.id],
      );
      const order = (orderRows as (RowDataPacket & { id: string; routeId: string; deliveryStatus: DriverDeliveryStatus | null })[])[0];
      if (!order) throw new Error("Delivery is not assigned to this driver.");
      const progress: Record<DriverDeliveryStatus, number> = { PICKED_UP: 0, IN_TRANSIT: 1, DELIVERED: 2 };
      if (order.deliveryStatus && progress[status] < progress[order.deliveryStatus]) {
        throw new Error("A delivery cannot be moved back to an earlier status.");
      }

      const orderStatus = status === "DELIVERED" ? "COMPLETED" : "OUT_FOR_DELIVERY";
      const [result] = await transaction.execute(
        "UPDATE `Order` SET deliveryStatus = ?, status = ?, updatedAt = ? WHERE id = ? AND routeId = ?",
        [status, orderStatus, new Date(), orderId, order.routeId],
      );
      if (!("affectedRows" in result) || result.affectedRows !== 1) throw new Error("Delivery status could not be saved.");

      const [aggregateRows] = await transaction.execute(
        "SELECT COUNT(*) AS total, SUM(deliveryStatus = 'DELIVERED') AS delivered, SUM(deliveryStatus = 'IN_TRANSIT') AS inTransit FROM `Order` WHERE routeId = ?",
        [order.routeId],
      );
      const aggregate = (aggregateRows as (RowDataPacket & { total: number; delivered: number; inTransit: number })[])[0];
      const routeStatus = aggregate && Number(aggregate.total) === Number(aggregate.delivered)
        ? "DELIVERED"
        : Number(aggregate?.inTransit ?? 0) > 0 ? "IN_TRANSIT" : "PICKED_UP";
      const now = new Date();
      await transaction.execute(
        "UPDATE DeliveryRoute SET status = ?, startedAt = CASE WHEN ? = 'IN_TRANSIT' THEN COALESCE(startedAt, ?) ELSE startedAt END, completedAt = CASE WHEN ? = 'DELIVERED' THEN ? ELSE NULL END, updatedAt = ? WHERE id = ?",
        [routeStatus, routeStatus, now, routeStatus, now, now, order.routeId],
      );
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Delivery status could not be saved." };
  }

  try {
    await logAuditEvent({
      actorId: current.userId,
      action: "Updated delivery status",
      entityType: "Order",
      entityId: orderId,
      metadata: { status },
    });
  } catch (error) {
    console.error("Delivery status was saved, but audit logging failed.", error);
  }
  revalidatePath("/driver");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function loginDriver(
  _previousState: DriverLoginState,
  formData: FormData,
): Promise<DriverLoginState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!phone || !/^\d{5}$/.test(pin)) return { error: "Enter your phone number and 5-digit PIN." };

  try {
    const users = await query<DriverUserRow>("SELECT u.id, d.pinHash FROM `User` u JOIN Driver d ON d.userId = u.id WHERE u.phone = ? AND u.status = 'ACTIVE' LIMIT 1", [phone]);
    const user = users[0];
    if (!user?.pinHash || !(await bcrypt.compare(pin, user.pinHash))) {
      return { error: "That phone number or PIN is not recognised." };
    }

    const access = await query<DriverAccessRow>("SELECT r.name AS roleName, p.key AS permissionKey FROM UserRole ur JOIN Role r ON r.id = ur.roleId LEFT JOIN RolePermission rp ON rp.roleId = r.id LEFT JOIN Permission p ON p.id = rp.permissionId WHERE ur.userId = ?", [user.id]);
    const roles = [...new Set(access.map((row) => row.roleName))];
    const permissions = [...new Set(access.flatMap((row) => row.permissionKey ? [row.permissionKey] : []))];
    const ttlSeconds = defaultTtlFor("driver", "driver-pin");
    const session = await createSession({
      id: user.id,
      roles,
      permissions,
      portal: "driver",
      authMethod: "driver-pin",
      ttlSeconds
    });
    const cookie = authCookie(session.token, ttlSeconds);
    (await cookies()).set(cookie.name, cookie.value, cookie);
    return { success: true };
  } catch {
    return { error: "Driver sign-in is temporarily unavailable. Try again shortly." };
  }
}