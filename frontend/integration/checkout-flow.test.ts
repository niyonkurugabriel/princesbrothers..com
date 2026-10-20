import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeCheckoutPayment, setCheckoutCurrency } from "../app/(storefront)/checkout/actions";
import { resolvePaymentContext } from "@/features/payments/payment-context";

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: vi.fn(),
    get: (name: string) => name === "pb_currency" ? { value: "USD" } : undefined
  }),
  headers: () => new Headers({ "cf-ipcountry": "RW" })
}));

describe("checkout flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers Rwanda mobile money and manual payment methods", async () => {
    const checkoutContext = resolvePaymentContext(new Request("https://princesbrothers.com/store/checkout", {
      headers: { "cf-ipcountry": "RW" }
    }));

    expect(checkoutContext.region).toBe("RWANDA");
    expect(checkoutContext.currency).toBe("RWF");

    expect(checkoutContext.gateways).toContain("MTN_MOMO");
    expect(checkoutContext.gateways).toContain("AIRTEL_MONEY");
    expect(checkoutContext.gateways).toContain("MANUAL");
  });

  it("requires a signed-in buyer before creating checkout records", async () => {
    const payment = await completeCheckoutPayment({
      items: [{ productId: "product-1", quantity: 1 }],
      address: { recipient: "Buyer One", line1: "1 Market Road", city: "Kigali", postalCode: "00000", countryCode: "RW", phone: "+250788123456" },
      gateway: "MANUAL"
    });

    expect(payment.ok).toBe(false);
    expect(payment.error).toContain("Sign in");
  });

  it("persists the selected storefront currency", async () => {
    const currencyResult = await setCheckoutCurrency("USD");
    expect(currencyResult.ok).toBe(true);
    expect(currencyResult.currency).toBe("USD");
  });
});
