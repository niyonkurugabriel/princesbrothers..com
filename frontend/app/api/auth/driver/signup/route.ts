import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@princess-brothers/db";
import { logAuditEvent } from "@/shared/server/audit";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: unknown; pin?: unknown; confirmPin?: unknown; location?: unknown } | null;
  if (!body || typeof body.phone !== "string" || typeof body.pin !== "string" || typeof body.confirmPin !== "string" || typeof body.location !== "string") return NextResponse.json({ error: "Phone number, matching five-digit PINs, and service location are required." }, { status: 400 });
  const phone = body.phone.trim();
  const location = body.location.trim();
  if (body.pin !== body.confirmPin) return NextResponse.json({ error: "The PINs do not match." }, { status: 400 });
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{5}$/.test(body.pin) || !location || location.length > 160) return NextResponse.json({ error: "Enter a valid international phone number, five-digit PIN, and service location (up to 160 characters)." }, { status: 400 });
  const existing = await query<RowDataPacket & { id: string }>("SELECT id FROM `User` WHERE phone = ? LIMIT 1", [phone]);
  if (existing.length) return NextResponse.json({ error: "That phone number already has an account. Sign in or recover its PIN." }, { status: 409 });

  const userId = randomUUID();
  const driverId = randomUUID();
  const now = new Date();
  const pinHash = await bcrypt.hash(body.pin, 12);
  try {
    await withTransaction(async (transaction) => {
      await transaction.execute("INSERT INTO `User` (id, email, firstName, lastName, phone, status, updatedAt) VALUES (?, ?, 'Driver', ?, ?, 'ACTIVE', ?)", [userId, `driver-${userId}@drivers.princesbrothers.com`, phone.slice(-4), phone, now]);
      await transaction.execute("INSERT INTO Driver (id, userId, licenseNumber, pinHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [driverId, userId, `PENDING-${driverId}`, pinHash, now, now]);
      await transaction.execute("INSERT INTO DriverLocation (id, driverId, locationName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)", [randomUUID(), driverId, location, now, now]);
    });
  } catch {
    return NextResponse.json({ error: "Driver account could not be created. Try another phone number or contact the company." }, { status: 409 });
  }
  await logAuditEvent({ actorId: userId, action: "Created driver account", entityType: "Driver", entityId: driverId, metadata: { location } });
  return NextResponse.json({ ok: true });
}