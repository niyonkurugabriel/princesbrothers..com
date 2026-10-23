import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiatePayment, pawaPayApiBaseUrl, toPawaPayAmount } from "./payments";

describe("PawaPay mobile money initialization", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("PAWAPAY_API_TOKEN", "test-pawapay-token");
    vi.stubEnv("PAWAPAY_API_URL", "https://api.sandbox.pawapay.io");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ depositId: "payment-reference", status: "ACCEPTED" })
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("formats whole-number RWF amounts and rejects unsupported values", () => {
    expect(toPawaPayAmount(1250, "RWF")).toBe("1250");
    expect(() => toPawaPayAmount(12.5, "RWF")).toThrow("whole-number");
    expect(() => toPawaPayAmount(1250, "USD")).toThrow("only enabled in RWF");
  });

  it("initiates MTN Rwanda deposits with the official provider code and normalized phone", async () => {
    const payment = await initiatePayment("MTN_MOMO", 2500, "RWF", "buyer@example.com", "payment-reference", {
      phone: "+250788123456",
      provider: "MTN",
      metadata: { orderNumber: "PB-ORDER-1" }
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const payload = JSON.parse(String(requestInit.body)) as Record<string, unknown>;

    expect(String(requestUrl)).toBe("https://api.sandbox.pawapay.io/v2/deposits");
    expect(requestInit.headers).toMatchObject({ Authorization: "Bearer test-pawapay-token" });
    expect(payload).toEqual({
      depositId: "payment-reference",
      amount: "2500",
      currency: "RWF",
      payer: { type: "MMO", accountDetails: { phoneNumber: "250788123456", provider: "MTN_MOMO_RWA" } },
      clientReferenceId: "PB-ORDER-1"
    });
    expect(payment.id).toBe("payment-reference");
    expect(payment.status).toBe("requires_action");
  });

  it("initiates Airtel Rwanda deposits using the PawaPay Airtel provider code", async () => {
    await initiatePayment("AIRTEL_MONEY", 2500, "RWF", "buyer@example.com", "airtel-reference", {
      phone: "+250788123456",
      provider: "Airtel"
    });
    const payload = JSON.parse(String((fetchMock.mock.calls[0] as [URL, RequestInit])[1].body)) as {
      payer: { accountDetails: { provider: string } };
    };
    expect(payload.payer.accountDetails.provider).toBe("AIRTEL_RWA");
  });

  it("rejects non-accepted deposits and does not send manual payments to PawaPay", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ depositId: "rejected-reference", status: "REJECTED", rejectionReason: { rejectionMessage: "Provider unavailable" } })
    });
    await expect(initiatePayment("MTN_MOMO", 2500, "RWF", "buyer@example.com", "rejected-reference", {
      phone: "+250788123456"
    })).rejects.toThrow("Provider unavailable");

    const manual = await initiatePayment("MANUAL", 2500, "RWF", "buyer@example.com", "manual-reference");
    expect(manual.gateway).toBe("MANUAL");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("requires an API token and only permits official provider endpoints", async () => {
    vi.stubEnv("PAWAPAY_API_TOKEN", "");
    await expect(initiatePayment("MTN_MOMO", 2500, "RWF", "buyer@example.com", "no-token", {
      phone: "+250788123456"
    })).rejects.toThrow("not configured");

    vi.stubEnv("PAWAPAY_API_TOKEN", "test-pawapay-token");
    vi.stubEnv("PAWAPAY_API_URL", "https://attacker.example");
    expect(() => pawaPayApiBaseUrl()).toThrow("PAWAPAY_API_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
