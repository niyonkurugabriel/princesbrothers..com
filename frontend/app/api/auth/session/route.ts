import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { expiredAuthCookie } from "@/features/auth/cookies";
import { revokeSession } from "@/features/auth/session";
import { verifyActiveSession } from "@/features/auth/server";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const claims = await verifyActiveSession(token);
  if (!claims) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, portal: claims.portal, roles: claims.roles });
}

export async function DELETE() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const claims = await verifyActiveSession(token);
    if (claims) await revokeSession(claims.sid);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(expiredAuthCookie());
  return response;
}
