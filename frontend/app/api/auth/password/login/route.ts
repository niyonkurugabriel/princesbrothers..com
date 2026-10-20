import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@princess-brothers/db";
import { authCookie } from "@/features/auth/cookies";
import { issueProviderSession } from "@/features/auth/providers";
import type { RowDataPacket } from "mysql2/promise";

type UserRow = RowDataPacket & { id: string; status: string; passwordHash: string | null };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const users = await query<UserRow>("SELECT id, status, passwordHash FROM `User` WHERE email = ? LIMIT 1", [body.email.trim().toLowerCase()]);
  const user = users[0];
  if (!user || user.status !== "ACTIVE" || !user.passwordHash || !await bcrypt.compare(body.password, user.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  try {
    const session = await issueProviderSession({ userId: user.id, portal: "storefront", authMethod: "password", roles: ["customer"] });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(authCookie(session.token, 60 * 60 * 24 * 30));
    return response;
  } catch {
    return NextResponse.json({ error: "Could not create a session. Check database connectivity." }, { status: 503 });
  }
}
