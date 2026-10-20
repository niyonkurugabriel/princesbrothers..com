import { jwtVerify, SignJWT } from "jose";
import { AUTH_JWT_AUDIENCE, AUTH_JWT_ISSUER } from "@/features/auth/config";
import type { AuthTokenClaims, CreateSessionInput } from "@/features/auth/types";

const getJwtSecret = (): Uint8Array => {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters");
  }

  return new TextEncoder().encode(secret);
};

export const signAccessToken = async (
  input: CreateSessionInput & { sessionId: string },
  expiresAt: number,
  now = Math.floor(Date.now() / 1000),
): Promise<string> => {
  const subject = input.id ?? `guest:${input.sessionId}`;
  const claims = {
    sid: input.sessionId,
    portal: input.portal,
    authMethod: input.authMethod,
    roles: input.roles,
    permissions: input.permissions,
    contributorApproved: input.contributorApproved ?? false,
    emailVerified: input.emailVerified ?? false,
    mfaVerified: input.mfaVerified ?? false
  };

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuer(AUTH_JWT_ISSUER)
    .setAudience(AUTH_JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());
};

export const verifyAccessToken = async (token: string): Promise<AuthTokenClaims> => {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: AUTH_JWT_ISSUER,
    audience: AUTH_JWT_AUDIENCE,
    algorithms: ["HS256"]
  });

  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.portal !== "string" ||
    typeof payload.authMethod !== "string" ||
    !Array.isArray(payload.roles) ||
    !Array.isArray(payload.permissions)
  ) {
    throw new Error("Invalid authentication token claims");
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    portal: payload.portal as AuthTokenClaims["portal"],
    authMethod: payload.authMethod as AuthTokenClaims["authMethod"],
    roles: payload.roles.filter((role): role is string => typeof role === "string"),
    permissions: payload.permissions.filter(
      (permission): permission is string => typeof permission === "string",
    ),
    contributorApproved: payload.contributorApproved === true,
    emailVerified: payload.emailVerified === true,
    mfaVerified: payload.mfaVerified === true,
    iat: typeof payload.iat === "number" ? payload.iat : 0,
    exp: typeof payload.exp === "number" ? payload.exp : 0
  };
};