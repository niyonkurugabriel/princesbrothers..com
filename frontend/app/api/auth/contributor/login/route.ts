import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@princess-brothers/db";
import { authCookie } from "@/features/auth/cookies";
import { issueProviderSession } from "@/features/auth/providers";
import type { RowDataPacket } from "mysql2/promise";

type ContributorUser = RowDataPacket & { id: string; passwordHash: string | null };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const users = await query<ContributorUser>("SELECT u.id, u.passwordHash FROM `User` u JOIN Contributor c ON c.userId = u.id WHERE u.email = ? AND u.status = 'ACTIVE' AND c.status = 'APPROVED' LIMIT 1", [body.email.trim().toLowerCase()]);
    const user = users[0];
    if (!user?.passwordHash || !await bcrypt.compare(body.password, user.passwordHash)) {
      return NextResponse.json({ error: "Email or password is incorrect, or the application is not approved." }, { status: 401 });
    }

    const session = await issueProviderSession({ userId: user.id, portal: "contributor", authMethod: "password", roles: ["supplier"], permissions: ["chat:read", "chat:write", "reports:write"], contributorApproved: true, emailVerified: false });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(authCookie(session.token, 60 * 60 * 24 * 7));
    return response;
  } catch {
    return NextResponse.json({ error: "Contributor sign-in is temporarily unavailable." }, { status: 503 });
  }
}