import type { AuthMethod, AuthPortal } from "./types";

export const AUTH_COOKIE_NAME = "pb_session";
export const AUTH_JWT_ISSUER = "princesbrothers.com";
export const AUTH_JWT_AUDIENCE = "princess-and-brothers-web";

export const sessionTtlSeconds: Record<AuthPortal, number> = {
  storefront: 60 * 60 * 24 * 30,
  contributor: 60 * 60 * 24 * 7,
  driver: 60 * 60 * 12,
  admin: 60 * 15
};

export const portalForPath = (pathname: string): AuthPortal | null => {
  if (pathname === "/store" || pathname.startsWith("/store/")) return "storefront";
  if (pathname === "/partner" || pathname.startsWith("/partner/")) return "contributor";
  if (pathname === "/driver" || pathname.startsWith("/driver/")) return "driver";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return null;
};

export const defaultTtlFor = (portal: AuthPortal, authMethod: AuthMethod): number => {
  if (portal === "driver") return sessionTtlSeconds.driver;
  if (portal === "admin") return sessionTtlSeconds.admin;
  return sessionTtlSeconds[portal];
};