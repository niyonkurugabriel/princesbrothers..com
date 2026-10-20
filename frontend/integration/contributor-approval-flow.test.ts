import { describe, expect, it } from "vitest";
import { authorizePortal } from "../middleware";
import type { AuthTokenClaims } from "@/features/auth/types";

const claims = (overrides: Partial<AuthTokenClaims> = {}): AuthTokenClaims => ({
  sub: "user-1",
  sid: "session-1",
  portal: "contributor",
  authMethod: "password",
  roles: ["supplier"],
  permissions: ["orders:read", "submissions:write"],
  contributorApproved: true,
  emailVerified: false,
  mfaVerified: false,
  iat: 1,
  exp: 2,
  ...overrides
});

describe("contributor approval flow", () => {
  it("redirects unapproved contributors to the pending page", () => {
    const decision = authorizePortal("/partner/submissions", claims({ contributorApproved: false }));
    expect(decision).toEqual({ allowed: false, reason: "not-approved" });
  });

  it("allows approved contributors to access their portal", () => {
    const decision = authorizePortal("/partner/submissions", claims());
    expect(decision.allowed).toBe(true);
  });

  it("requires the password-based contributor auth method", () => {
    const decision = authorizePortal(
      "/partner/submissions",
      claims({ authMethod: "phone-otp", contributorApproved: true, emailVerified: false }),
    );
    expect(decision).toEqual({ allowed: false, reason: "invalid-auth-method" });
  });
});
