import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn()
}));

vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("@princess-brothers/db", () => ({ execute: vi.fn(), query: vi.fn() }));
vi.mock("@/features/auth/config", () => ({ defaultTtlFor: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ createSession: vi.fn() }));

import { sendEmail } from "@/features/auth/providers";

describe("SMTP email provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue(undefined);
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("EMAIL_FROM", "auth@princesbrothers.com");
    vi.stubEnv("EMAIL_SERVER_HOST", "127.0.0.1");
    vi.stubEnv("EMAIL_SERVER_PORT", "25");
    vi.stubEnv("EMAIL_SERVER_USER", "none");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "none");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends through a local unauthenticated Postfix relay", async () => {
    await sendEmail("buyer@example.com", "Reset password", "Use the recovery link.");

    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: "127.0.0.1",
      port: 25,
      secure: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000
    });
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: "auth@princesbrothers.com",
      to: "buyer@example.com",
      subject: "Reset password",
      text: "Use the recovery link."
    });
  });

  it("uses SMTP authentication when credentials are configured", async () => {
    vi.stubEnv("EMAIL_SERVER_PORT", "587");
    vi.stubEnv("EMAIL_SERVER_USER", "smtp-user");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "smtp-password");

    await sendEmail("buyer@example.com", "Reset password", "Use the recovery link.");

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "127.0.0.1",
      port: 587,
      secure: false,
      auth: { user: "smtp-user", pass: "smtp-password" }
    }));
  });

  it("rejects invalid SMTP ports before opening a connection", async () => {
    vi.stubEnv("EMAIL_SERVER_PORT", "70000");

    await expect(sendEmail("buyer@example.com", "Reset password", "Use the recovery link."))
      .rejects.toThrow("valid EMAIL_SERVER_HOST and EMAIL_SERVER_PORT");
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
});
