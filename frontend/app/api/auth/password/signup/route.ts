import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { query, execute } from "@princess-brothers/db";
import { authCookie } from "@/features/auth/cookies";
import { issueProviderSession } from "@/features/auth/providers";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; firstName?: unknown; lastName?: unknown; phone?: unknown; password?: unknown; confirmPassword?: unknown } | null;
  if (!body || typeof body.email !== "string" || typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.phone !== "string" || typeof body.password !== "string" || typeof body.confirmPassword !== "string") {
    return NextResponse.json({ error: "Complete every required account field." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const firstName = body.firstName.trim();
  const lastName = body.lastName.trim();
  const phone = body.phone.trim();
  const password = body.password;
  if (password !== body.confirmPassword) return NextResponse.json({ error: "The passwords do not match." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email) || !firstName || firstName.length > 100 || !lastName || lastName.length > 100 || !/^\+[1-9]\d{7,14}$/.test(phone) || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Enter a valid email, name, international phone number, and password with at least 8 characters." }, { status: 400 });
  }

  const userId = randomUUID();
  const now = new Date();
  try {
    const existing = await query<RowDataPacket & { id: string }>("SELECT id FROM `User` WHERE email = ? OR phone = ? LIMIT 1", [email, phone]);
    if (existing.length) return NextResponse.json({ error: "That email address or phone number is already registered." }, { status: 409 });
    await execute("INSERT INTO `User` (id, email, passwordHash, firstName, lastName, phone, status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)", [userId, email, await bcrypt.hash(password, 12), firstName, lastName, phone, now]);
    const session = await issueProviderSession({ userId, portal: "storefront", authMethod: "password", roles: ["customer"] });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(authCookie(session.token, 60 * 60 * 24 * 30));
    return response;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "That email address or phone number is already registered." }, { status: 409 });
    console.error("Storefront signup failed.", error);
    return NextResponse.json({ error: "Account creation is temporarily unavailable. Please try again." }, { status: 503 });
  }
}