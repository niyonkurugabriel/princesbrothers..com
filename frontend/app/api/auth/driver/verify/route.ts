import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@princess-brothers/db";
import { verifyPhoneOtp } from "@/features/auth/providers";
import { logAuditEvent } from "@/shared/server/audit";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: unknown; code?: unknown; purpose?: unknown; pin?: unknown } | null;
  if (!body || typeof body.phone !== "string" || typeof body.code !== "string" || typeof body.pin !== "string" || body.purpose !== "password-reset") return NextResponse.json({ error: "Phone, recovery code, and new five-digit PIN are required." }, { status: 400 });
  if (!/^\+[1-9]\d{7,14}$/.test(body.phone.trim()) || !/^\d{5}$/.test(body.pin)) return NextResponse.json({ error: "Enter a valid phone number and a five-digit PIN." }, { status: 400 });
  const phone = body.phone.trim();
  if (!await verifyPhoneOtp(phone, body.code, "driver-password-reset")) return NextResponse.json({ error: "That SMS code is incorrect or expired." }, { status: 401 });
  const pinHash = await bcrypt.hash(body.pin, 12);
  const drivers = await query<RowDataPacket & { id: string; userId: string }>("SELECT d.id, d.userId FROM Driver d JOIN `User` u ON u.id = d.userId WHERE u.phone = ? AND u.status = 'ACTIVE' LIMIT 1", [phone]);
  const driver = drivers[0];
  if (!driver) return NextResponse.json({ error: "No active driver account is linked to that phone." }, { status: 404 });
  await withTransaction(async (transaction) => {
    await transaction.execute("UPDATE Driver SET pinHash = ?, updatedAt = ? WHERE id = ?", [pinHash, new Date(), driver.id]);
    await transaction.execute("UPDATE `Session` SET revokedAt = ? WHERE userId = ? AND portal = 'driver' AND revokedAt IS NULL", [new Date(), driver.userId]);
  });
  await logAuditEvent({ actorId: driver.userId, action: "Reset driver PIN by SMS", entityType: "Driver", entityId: driver.id });
  return NextResponse.json({ ok: true });
}