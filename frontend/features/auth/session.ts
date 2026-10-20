import { randomUUID } from "node:crypto";
import { execute, query } from "@princess-brothers/db";
import { defaultTtlFor } from "@/features/auth/config";
import { signAccessToken } from "@/features/auth/jwt";
import type { AuthMethod, AuthPortal, CreateSessionInput, SessionRecord } from "@/features/auth/types";
import type { RowDataPacket } from "mysql2/promise";

type SessionRow = RowDataPacket & {
  userId: string | null;
  portal: string;
  authMethod: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

const toSessionRecord = (row: {
  userId: string | null;
  portal: string;
  authMethod: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}): SessionRecord => ({
  userId: row.userId ?? undefined,
  portal: row.portal as AuthPortal,
  authMethod: row.authMethod as AuthMethod,
  createdAt: Math.floor(row.createdAt.getTime() / 1000),
  lastSeenAt: Math.floor(row.lastSeenAt.getTime() / 1000),
  expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
  ...(row.revokedAt ? { revokedAt: Math.floor(row.revokedAt.getTime() / 1000) } : {})
});

export const createSession = async (
  input: CreateSessionInput,
): Promise<{ sessionId: string; token: string; session: SessionRecord }> => {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = input.ttlSeconds ?? defaultTtlFor(input.portal, input.authMethod);
  const sessionId = randomUUID();
  const session: SessionRecord = {
    userId: input.id,
    portal: input.portal,
    authMethod: input.authMethod,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + ttlSeconds
  };

  const token = await signAccessToken({ ...input, sessionId }, session.expiresAt, now);
  await execute(
    "INSERT INTO `Session` (id, userId, portal, authMethod, createdAt, lastSeenAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [sessionId, input.id ?? null, input.portal, input.authMethod, new Date(now * 1000), new Date(now * 1000), new Date(session.expiresAt * 1000)]
  );

  return { sessionId, token, session };
};

export const getSession = async (
  sessionId: string,
): Promise<SessionRecord | null> => {
  const rows = await query<SessionRow>("SELECT userId, portal, authMethod, createdAt, lastSeenAt, expiresAt, revokedAt FROM `Session` WHERE id = ? LIMIT 1", [sessionId]);
  return rows[0] ? toSessionRecord(rows[0]) : null;
};

export const isSessionActive = async (
  sessionId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> => {
  const rows = await query("SELECT id FROM `Session` WHERE id = ? AND revokedAt IS NULL AND expiresAt > ? LIMIT 1", [sessionId, new Date(now * 1000)]);
  return rows.length > 0;
};

export const touchSession = async (
  sessionId: string,
  ttlSeconds: number,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> => {
  const result = await execute(
    "UPDATE `Session` SET lastSeenAt = ?, expiresAt = ? WHERE id = ? AND revokedAt IS NULL AND expiresAt > ?",
    [new Date(now * 1000), new Date((now + ttlSeconds) * 1000), sessionId, new Date(now * 1000)]
  );
  return result.affectedRows > 0;
};

export const revokeSession = async (
  sessionId: string,
): Promise<void> => {
  await execute("UPDATE `Session` SET revokedAt = ? WHERE id = ? AND revokedAt IS NULL", [new Date(), sessionId]);
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await execute("DELETE FROM `Session` WHERE id = ?", [sessionId]);
};