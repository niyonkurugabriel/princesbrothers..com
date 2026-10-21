import { getSession, isSessionActive, touchSession } from "@/features/auth/session";
import { verifyAccessToken } from "@/features/auth/jwt";
import { signAccessToken } from "@/features/auth/jwt";
import type { AuthTokenClaims } from "@/features/auth/types";

export const verifyActiveSession = async (
  token: string,
): Promise<Awaited<ReturnType<typeof verifyAccessToken>> | null> => {
  try {
    const claims = await verifyAccessToken(token);
    if (!(await isSessionActive(claims.sid))) return null;

    const session = await getSession(claims.sid);
    if (
      !session ||
      session.portal !== claims.portal ||
      (session.userId && session.userId !== claims.sub)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
};

export const refreshSessionToken = async (
  claims: AuthTokenClaims,
  ttlSeconds: number,
  now = Math.floor(Date.now() / 1000),
): Promise<string | null> => {
  if (!(await touchSession(claims.sid, ttlSeconds, now))) return null;

  return signAccessToken(
    {
      id: claims.sub.startsWith("guest:") ? undefined : claims.sub,
      roles: claims.roles,
      permissions: claims.permissions,
      contributorApproved: claims.contributorApproved,
      emailVerified: claims.emailVerified,
      portal: claims.portal,
      authMethod: claims.authMethod,
      sessionId: claims.sid
    },
    now + ttlSeconds,
    now,
  );
};