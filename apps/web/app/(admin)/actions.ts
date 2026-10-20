"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "../../lib/auth/config";
import { logAuditEvent } from "../../lib/audit";
import { deleteSession } from "../../lib/auth/session";
import { getRedisSessionStore } from "../../lib/auth/redis";
import { verifyActiveSession } from "../../lib/auth/server";
import type { Prisma } from "@prisma/client";

async function adminActorId(): Promise<string | undefined> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return undefined;
  if (!process.env.REDIS_URL) return undefined;
  try {
    const claims = await verifyActiveSession(getRedisSessionStore(), token);
    if (!claims || claims.portal !== "admin" || !["password", "password-totp"].includes(claims.authMethod)) return undefined;
    return claims.sub;
  } catch {
    return undefined;
  }
}

export async function mutateAdmin(action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
  const actorId = await adminActorId();
  if (!actorId) return { ok: false, error: "MFA-verified admin session required." };
  await logAuditEvent({ actorId, action, entityType, entityId, metadata });
  return { ok: true };
}

export async function revokeAdminSession(sessionId: string) {
  const result = await mutateAdmin("Revoked session", "Session", sessionId);
  if (!result.ok) return result;
  if (process.env.REDIS_URL) await deleteSession(getRedisSessionStore(), sessionId);
  return { ok: true };
}