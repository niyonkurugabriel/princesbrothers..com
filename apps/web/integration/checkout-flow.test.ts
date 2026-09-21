import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeCheckoutPayment, setCheckoutCurrency } from "../app/(storefront)/checkout/actions";
import { resolvePaymentContext } from "../lib/payment-context";

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: vi.fn()
  }),
  headers: () => new Headers({ "cf-ipcountry": "RW" })
}));

describe("checkout flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid regional checkout and converts currency before payment", async () => {
    const checkoutContext = resolvePaymentContext(new Request("https://princesbrothers.com/store/checkout", {
      headers: { "cf-ipcountry": "RW" }
    }));

    expect(checkoutContext.region).toBe("RWANDA");
    expect(checkoutContext.currency).toBe("RWF");

    const currencyResult = await setCheckoutCurrency("USD");
    expect(currencyResult.ok).toBe(true);
    expect(currencyResult.currency).toBe("USD");

    const payment = await completeCheckoutPayment({
      baseAmount: 100,
      baseCurrency: "USD",
      gateway: "LOCAL_CARD"
    });

    expect(payment.ok).toBe(true);
    expect(payment.context?.currency).toBe("USD");
    expect(payment.paymentId).toMatch(/^mock_pi_/);
  });

  it("rejects unsupported gateways for the detected region", async () => {
    const payment = await completeCheckoutPayment({
      baseAmount: 200,
      baseCurrency: "USD",
      gateway: "STRIPE"
    });

    expect(payment.ok).toBe(false);
    expect(payment.error).toContain("not available");
  });
});
