import { describe, expect, it } from "vitest";
import { authorizePortal } from "./middleware";
import type { AuthTokenClaims } from "./lib/auth/types";

const claims = (overrides: Partial<AuthTokenClaims> = {}): AuthTokenClaims => ({
  sub: "user-1",
  sid: "session-1",
  portal: "storefront",
  authMethod: "password",
  roles: ["customer"],
  permissions: [],
  contributorApproved: false,
  emailVerified: true,
  mfaVerified: false,
  iat: 1,
  exp: 2,
  ...overrides
});

describe("authorizePortal", () => {
  it("allows guests to browse storefront routes", () => {
    expect(authorizePortal("/store/products", null)).toEqual({ allowed: true, user: null });
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

  it("blocks contributors until approval and email verification", () => {
    expect(
      authorizePortal(
        "/partner/submissions",
        claims({ portal: "contributor", contributorApproved: false }),
      ),
    ).toEqual({ allowed: false, reason: "not-approved" });

    expect(
      authorizePortal(
        "/partner/submissions",
        claims({ portal: "contributor", contributorApproved: true, emailVerified: true }),
      ),
    ).toMatchObject({ allowed: true });
  });

  it("accepts only the work-email password flow for contributors", () => {
    expect(
      authorizePortal(
        "/partner/submissions",
        claims({
          portal: "contributor",
          authMethod: "phone-otp",
          contributorApproved: true,
          emailVerified: true
        }),
      ),
    ).toEqual({ allowed: false, reason: "invalid-auth-method" });
  });

  it("accepts only PIN or SMS OTP sessions for drivers", () => {
    expect(
      authorizePortal("/driver/routes", claims({ portal: "driver", authMethod: "password" })),
    ).toEqual({ allowed: false, reason: "wrong-portal" });
    expect(
      authorizePortal("/driver/routes", claims({ portal: "driver", authMethod: "sms-otp" })),
    ).toMatchObject({ allowed: true });
  });

  it("requires a verified TOTP step for admins", () => {
    expect(
      authorizePortal("/admin/dashboard", claims({ portal: "admin", mfaVerified: false })),
    ).toEqual({ allowed: false, reason: "mfa-required" });
    expect(
      authorizePortal(
        "/admin/dashboard",
        claims({ portal: "admin", authMethod: "password-totp", mfaVerified: true }),
      ),
    ).toMatchObject({ allowed: true });
  });
});