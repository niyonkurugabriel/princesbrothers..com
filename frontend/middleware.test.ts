import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/features/auth/jwt", () => ({ verifyAccessToken: mocks.verifyAccessToken }));

import { authorizePortal, middleware } from "./middleware";
import type { AuthTokenClaims } from "@/features/auth/types";

const claims = (overrides: Partial<AuthTokenClaims> = {}): AuthTokenClaims => ({
  sub: "user-1",
  sid: "session-1",
  portal: "storefront",
  authMethod: "password",
  roles: ["customer"],
  permissions: [],
  contributorApproved: false,
  emailVerified: true,
  iat: 1,
  exp: 2,
  ...overrides
});

describe("authorizePortal", () => {
  it("allows guests to browse storefront routes", () => {
    expect(authorizePortal("/products", null)).toEqual({ allowed: true, user: null });
    expect(authorizePortal("/account", null)).toEqual({ allowed: false, reason: "unauthenticated" });
  });

  it("requires a session for protected portals", () => {
    expect(authorizePortal("/partner/catalog", null)).toEqual({
      allowed: false,
      reason: "unauthenticated"
    });
  });

  it("does not allow a session from one portal into another", () => {
    expect(authorizePortal("/admin/users", claims())).toEqual({
      allowed: false,
      reason: "wrong-portal"
    });
  });

  it("blocks contributors until approval without requiring email verification", () => {
    expect(
      authorizePortal(
        "/partner/submissions",
        claims({ portal: "contributor", contributorApproved: false }),
      ),
    ).toEqual({ allowed: false, reason: "not-approved" });

    expect(
      authorizePortal(
        "/partner/submissions",
        claims({ portal: "contributor", contributorApproved: true, emailVerified: false }),
      ),
    ).toMatchObject({ allowed: true });
  });

  it("accepts only the work-email password flow for contributors", () => {
    expect(
      authorizePortal(
        "/partner/submissions",
        claims({
          portal: "contributor",
          authMethod: "guest",
          contributorApproved: true,
          emailVerified: true
        }),
      ),
    ).toEqual({ allowed: false, reason: "invalid-auth-method" });
  });

  it("accepts only PIN sessions for drivers", () => {
    expect(
      authorizePortal("/driver/routes", claims({ portal: "driver", authMethod: "password" })),
    ).toEqual({ allowed: false, reason: "wrong-portal" });
    expect(
      authorizePortal("/driver/routes", claims({ portal: "driver", authMethod: "driver-pin" })),
    ).toMatchObject({ allowed: true });
  });

  it("allows password admin sign-in without requiring TOTP", () => {
    expect(
      authorizePortal("/admin/dashboard", claims({ portal: "admin", authMethod: "password" })),
    ).toMatchObject({ allowed: true });
  });
});

describe("portal login redirects", () => {
  it("sends unauthenticated contributors to the existing partner entry page", async () => {
    const response = await middleware(new NextRequest("http://localhost/partner/dashboard"));
    const destination = new URL(response.headers.get("location") ?? "http://localhost");

    expect(response.status).toBe(307);
    expect(destination.pathname).toBe("/partner");
    expect(destination.searchParams.get("returnTo")).toBe("/partner/dashboard");
  });
});

describe("admin subdomain routing", () => {
  it("rewrites the admin subdomain root to the protected admin dashboard", async () => {
    mocks.verifyAccessToken.mockResolvedValue(claims({ portal: "admin" }));
    const request = new NextRequest("https://admin.princesbrothers.com/", {
      headers: { cookie: "pb_session=valid-admin-session" }
    });

    const response = await middleware(request);

    expect(response.headers.get("x-middleware-rewrite")).toBe("https://admin.princesbrothers.com/admin");
  });

  it("guards subdomain paths as admin routes and keeps the admin login reachable", async () => {
    const protectedResponse = await middleware(new NextRequest("https://admin.princesbrothers.com/dashboard"));
    const loginResponse = await middleware(new NextRequest("https://admin.princesbrothers.com/login/admin"));
    const loginUrl = new URL(protectedResponse.headers.get("location") ?? "https://admin.princesbrothers.com");

    expect(loginUrl.pathname).toBe("/login/admin");
    expect(loginUrl.searchParams.get("returnTo")).toBe("/dashboard");
    expect(loginResponse.headers.get("x-middleware-rewrite")).toBeNull();
    expect(loginResponse.status).toBe(200);
  });

  it("does not rewrite Next.js assets or API requests on the admin host", async () => {
    const assetResponse = await middleware(new NextRequest("https://admin.princesbrothers.com/logo.png"));
    const apiResponse = await middleware(new NextRequest("https://admin.princesbrothers.com/api/auth/admin/login"));

    expect(assetResponse.headers.get("x-middleware-rewrite")).toBeNull();
    expect(apiResponse.headers.get("x-middleware-rewrite")).toBeNull();
  });
});