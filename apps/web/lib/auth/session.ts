import { randomUUID } from "node:crypto";
import { defaultTtlFor } from "./config";
import { signAccessToken } from "./jwt";
import type {
  CreateSessionInput,
  RedisSessionStore,
  SessionRecord
} from "./types";

const sessionKey = (sessionId: string): string => `pb:session:${sessionId}`;

const encodeSession = (session: SessionRecord): string => JSON.stringify(session);

const parseSession = (value: string | null): SessionRecord | null => {
  if (!value) return null;

  try {
    const session = JSON.parse(value) as SessionRecord;
    if (
      typeof session.portal !== "string" ||
      typeof session.authMethod !== "string" ||
      typeof session.createdAt !== "number" ||
      typeof session.lastSeenAt !== "number" ||
      typeof session.expiresAt !== "number"
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

export const createSession = async (
  store: RedisSessionStore,
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

  await store.set(sessionKey(sessionId), encodeSession(session), "EX", ttlSeconds);
  const token = await signAccessToken({ ...input, sessionId }, session.expiresAt, now);

  return { sessionId, token, session };
};

export const getSession = async (
  store: RedisSessionStore,
  sessionId: string,
): Promise<SessionRecord | null> => parseSession(await store.get(sessionKey(sessionId)));

export const isSessionActive = async (
  store: RedisSessionStore,
  sessionId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> => {
  const session = await getSession(store, sessionId);
  return Boolean(session && !session.revokedAt && session.expiresAt > now);
};

export const touchSession = async (
  store: RedisSessionStore,
  sessionId: string,
  ttlSeconds: number,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> => {
  const session = await getSession(store, sessionId);
  if (!session || session.revokedAt || session.expiresAt <= now) return false;

  const updatedSession = { ...session, lastSeenAt: now, expiresAt: now + ttlSeconds };
  await store.set(sessionKey(sessionId), encodeSession(updatedSession), "EX", ttlSeconds);
  return true;
};

export const revokeSession = async (
  store: RedisSessionStore,
  sessionId: string,
): Promise<void> => {
  const session = await getSession(store, sessionId);
  if (!session) return;

  await store.set(
    sessionKey(sessionId),
    encodeSession({ ...session, revokedAt: Math.floor(Date.now() / 1000) }),
    "EX",
    60 * 60 * 24 * 30,
  );
};

export const deleteSession = async (
  store: RedisSessionStore,
  sessionId: string,
): Promise<void> => {
  await store.del(sessionKey(sessionId));
};