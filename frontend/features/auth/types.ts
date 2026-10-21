export const authPortals = ["storefront", "contributor", "driver", "admin"] as const;
export type AuthPortal = (typeof authPortals)[number];

export const authMethods = [
  "password",
  "google-oauth",
  "guest",
  "driver-pin"
] as const;
export type AuthMethod = (typeof authMethods)[number];

export type SessionUser = {
  id?: string;
  roles: string[];
  permissions: string[];
  contributorApproved?: boolean;
  emailVerified?: boolean;
};

export type AuthTokenClaims = SessionUser & {
  sub: string;
  sid: string;
  portal: AuthPortal;
  authMethod: AuthMethod;
  iat: number;
  exp: number;
};

export type SessionRecord = {
  userId?: string;
  portal: AuthPortal;
  authMethod: AuthMethod;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  revokedAt?: number;
};

export type CreateSessionInput = SessionUser & {
  portal: AuthPortal;
  authMethod: AuthMethod;
  ttlSeconds?: number;
  now?: number;
};