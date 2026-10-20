import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { googleAuthorizationUrl } from "./providers";

describe("Google OAuth redirect configuration", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends the configured callback URI in the authorization request", () => {
    const authorizationUrl = new URL(googleAuthorizationUrl("test-state"));

    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(authorizationUrl.searchParams.get("client_id")).toBe("test-client-id");
    expect(authorizationUrl.searchParams.get("state")).toBe("test-state");
  });

  it("rejects a callback path that does not match the application route", () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/google/callback");

    expect(() => googleAuthorizationUrl("test-state")).toThrow("GOOGLE_REDIRECT_URI must be an absolute URL ending in /api/auth/google/callback.");
  });
});
