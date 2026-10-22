import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiatePayment, toPaystackMinorAmount } from "./payments";

describe("Paystack payment initialization", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "test-paystack-secret");
    vi.stubEnv("APP_URL", "https://princesbrothers.com");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          reference: "payment-reference",
          authorization_url: "https://checkout.paystack.com/example"
        }
      })
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uses Paystack's zero-decimal amount units for RWF and UGX", () => {
    expect(toPaystackMinorAmount(1250, "RWF")).toBe(1250);
    expect(toPaystackMinorAmount(12.5, "USD")).toBe(1250);
    expect(toPaystackMinorAmount(1250, "UGX")).toBe(1250);
  });

  it("restricts MTN mobile money checkout to the mobile-money channel", async () => {
    const payment = await initiatePayment("MTN_MOMO", 2500, "RWF", "buyer@example.com", "payment-reference", {
      phone: "+250788123456",
      provider: "MTN"
    });
    const request = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(request[1].body)) as Record<string, unknown>;

    expect(payment.authorizationUrl).toBe("https://checkout.paystack.com/example");
    expect(payload.channels).toEqual(["mobile_money"]);
    expect(payload.mobile_money).toEqual({ provider: "MTN", phone: "+250788123456" });
    expect(payload.amount).toBe(2500);
  });

  it("initializes Airtel Money as mobile money and bank-card checkout as card-only", async () => {
    await initiatePayment("AIRTEL_MONEY", 2500, "RWF", "buyer@example.com", "airtel-reference", {
      phone: "+250788123456",
      provider: "Airtel"
    });
    let payload = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    expect(payload.channels).toEqual(["mobile_money"]);
    expect(payload.mobile_money).toEqual({ provider: "Airtel", phone: "+250788123456" });

    fetchMock.mockClear();
    await initiatePayment("PAYSTACK", 25.5, "USD", "buyer@example.com", "card-reference");
    payload = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    expect(payload.channels).toEqual(["card"]);
    expect(payload).not.toHaveProperty("mobile_money");
    expect(payload.amount).toBe(2550);
  });

  it("leaves manual payments out of Paystack", async () => {
    const payment = await initiatePayment("MANUAL", 100, "RWF", "buyer@example.com", "manual-reference");

    expect(payment.gateway).toBe("MANUAL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});