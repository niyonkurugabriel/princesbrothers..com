import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, portalForPath } from "./lib/auth/config";
import { verifyAccessToken } from "./lib/auth/jwt";
import type { AuthPortal, AuthTokenClaims } from "./lib/auth/types";

export type GuardDecision =
  | { allowed: true; user: AuthTokenClaims | null }
  | {
      allowed: false;
      reason: "unauthenticated" | "wrong-portal" | "not-approved" | "mfa-required" | "invalid-auth-method";
    };

const isPortalUser = (claims: AuthTokenClaims, portal: AuthPortal): boolean =>
  claims.portal === portal;

export const authorizePortal = (
  pathname: string,
  claims: AuthTokenClaims | null,
): GuardDecision => {
  const portal = portalForPath(pathname);
  if (!portal) return { allowed: true, user: claims };
  if (portal === "storefront" && !claims) return { allowed: true, user: null };
  if (!claims) return { allowed: false, reason: "unauthenticated" };
  if (!isPortalUser(claims, portal)) return { allowed: false, reason: "wrong-portal" };

  if (portal === "contributor" && claims.authMethod !== "password") {
    return { allowed: false, reason: "invalid-auth-method" };
  }

  if (portal === "contributor" && (!claims.contributorApproved || !claims.emailVerified)) {
    return { allowed: false, reason: "not-approved" };
  }

  if (portal === "admin" && (!claims.mfaVerified || claims.authMethod !== "password-totp")) {
    return { allowed: false, reason: "mfa-required" };
  }

  if (portal === "driver" && !["driver-pin", "sms-otp"].includes(claims.authMethod)) {
    return { allowed: false, reason: "wrong-portal" };
  }

  return { allowed: true, user: claims };
};

const loginPath = (request: NextRequest, portal: AuthPortal): URL => {
  const url = new URL(portal === "driver" ? "/driver/login" : `/login/${portal}`, request.url);
  url.searchParams.set("returnTo", request.nextUrl.pathname);
  return url;
};

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/driver/login") return NextResponse.next();
  const publicContributorPath =
    pathname === "/partner" || pathname === "/partner/apply" || pathname === "/partner/pending";
  if (publicContributorPath) {
    if (pathname === "/partner/pending") {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      if (!token) return NextResponse.redirect(new URL("/partner", request.url));
    }
    return NextResponse.next();
  }

  const portal = portalForPath(pathname);
  if (!portal) return NextResponse.next();

  let claims: AuthTokenClaims | null = null;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    try {
      claims = await verifyAccessToken(token);
    } catch {
      claims = null;
    }
  }

  const decision = authorizePortal(pathname, claims);
  if (decision.allowed) return NextResponse.next();

  if (portal === "contributor" && decision.reason === "not-approved" && claims) {
    return NextResponse.redirect(new URL("/partner/pending", request.url));
  }

  const response = NextResponse.redirect(loginPath(request, portal));
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

export const config = {
  matcher: ["/store/:path*", "/partner/:path*", "/driver/:path*", "/admin/:path*"]
};