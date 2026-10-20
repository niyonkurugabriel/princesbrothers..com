import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { execute, query } from "@princess-brothers/db";
import { consentTypeForPreferences, PRIVACY_POLICY_VERSION } from "@/features/privacy/policy";
import { PRIVACY_CONSENT_COOKIE } from "@/features/privacy/consent";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyAccessToken } from "@/features/auth/jwt";
import { isSessionActive } from "@/features/auth/session";
import type { RowDataPacket } from "mysql2/promise";

type ConsentPreferences = { necessary: true; geolocation: boolean; analytics: boolean };
type UserIdRow = RowDataPacket & { id: string };

function requestIp(request: Request): string {
  const candidate = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

function countryFromRequest(request: Request): string | null {
  const country = request.headers.get("cf-ipcountry")
    ?? request.headers.get("cloudfront-viewer-country")
    ?? request.headers.get("x-vercel-ip-country");
  return country?.trim().slice(0, 100) || null;
}

async function consentUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
  if (!token || !process.env.AUTH_JWT_SECRET) return null;

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    return null;
  }
  if (claims.sub.startsWith("guest:") || !(await isSessionActive(claims.sid))) return null;
  const users = await query<UserIdRow>("SELECT id FROM `User` WHERE id = ? LIMIT 1", [claims.sub]);
  return users[0]?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { preferences?: Partial<ConsentPreferences>; consentType?: unknown } | null;
    const preferences = body?.preferences;
    if (
      !preferences
      || preferences.necessary !== true
      || typeof preferences.geolocation !== "boolean"
      || typeof preferences.analytics !== "boolean"
    ) {
      return NextResponse.json({ error: "Valid necessary, geolocation, and analytics preferences are required." }, { status: 400 });
    }

    const validPreferences: ConsentPreferences = {
      necessary: true,
      geolocation: preferences.geolocation,
      analytics: preferences.analytics
    };
    const consentType = consentTypeForPreferences(validPreferences);
    if (body?.consentType !== consentType) {
      return NextResponse.json({ error: "The consent category does not match the selected preferences." }, { status: 400 });
    }

    await execute(
      "INSERT INTO consent_logs (user_id, ip_address, user_agent, consent_type, geolocation_country, preferences, policy_version) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        await consentUserId(request),
        requestIp(request),
        request.headers.get("user-agent")?.slice(0, 4000) ?? null,
        consentType,
        countryFromRequest(request),
        JSON.stringify(validPreferences),
        PRIVACY_POLICY_VERSION
      ]
    );

    const response = NextResponse.json({ ok: true, consentType });
    const value = Buffer.from(JSON.stringify({ version: PRIVACY_POLICY_VERSION, ...validPreferences }), "utf8").toString("base64url");
    response.cookies.set(PRIVACY_CONSENT_COOKIE, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
    return response;
  } catch (error) {
    console.error("Privacy consent could not be recorded.", error);
    return NextResponse.json({ error: "Your privacy preferences could not be saved. Please try again." }, { status: 503 });
  }
}
