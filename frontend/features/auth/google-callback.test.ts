import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeGoogleState: vi.fn(),
  exchangeGoogleCode: vi.fn(),
  findOrCreateGoogleUser: vi.fn(),
  issueProviderSession: vi.fn(),
  authCookie: vi.fn()
}));

vi.mock("@/features/auth/cookies", () => ({ authCookie: mocks.authCookie }));
vi.mock("@/features/auth/providers", () => ({
  consumeGoogleState: mocks.consumeGoogleState,
  exchangeGoogleCode: mocks.exchangeGoogleCode,
  findOrCreateGoogleUser: mocks.findOrCreateGoogleUser,
  issueProviderSession: mocks.issueProviderSession
}));

import { GET } from "@/app/api/auth/google/callback/route";

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://www.princesbrothers.com");
    mocks.consumeGoogleState.mockResolvedValue(true);
    mocks.exchangeGoogleCode.mockResolvedValue({
      id: "google-user-id",
      email: "buyer@example.com",
      firstName: "Buyer",
      lastName: "Example",
      emailVerified: true
    });
    mocks.findOrCreateGoogleUser.mockResolvedValue("user-id");
    mocks.issueProviderSession.mockResolvedValue({ token: "session-token" });
    mocks.authCookie.mockReturnValue({ name: "auth", value: "session-token", path: "/" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects successful sign-ins to the canonical homepage, not the internal callback host", async () => {
    const response = await GET(new Request("http://internal-server:3000/api/auth/google/callback?state=oauth-state&code=google-code"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.princesbrothers.com/");
    expect(response.headers.get("set-cookie")).toContain("session-token");
    expect(mocks.consumeGoogleState).toHaveBeenCalledWith("oauth-state");
  });

  it("uses the callback origin for local deployments without APP_URL", async () => {
    vi.stubEnv("APP_URL", "");

    const response = await GET(new Request("http://localhost:3000/api/auth/google/callback?state=oauth-state&code=google-code"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
