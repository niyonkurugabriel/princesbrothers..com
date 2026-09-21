import { describe, expect, it } from "vitest";
import { convertAmount, resolvePaymentContext } from "./payment-context";

describe("payment context and FX conversion", () => {
  it("converts USD to RWF using the configured FX rate", () => {
    expect(convertAmount(100, "USD", "RWF")).toBe(135000);
    expect(convertAmount(1000, "RWF", "USD")).toBe(0.74);
  });

  it("prefers manual currency override when provided in headers", () => {
    const request = new Request("https://princesbrothers.com/store/checkout", {
      headers: {
        "cf-ipcountry": "RW",
        cookie: "pb_currency=USD",
        "x-pb-currency": "KES"
      }
    });

    const context = resolvePaymentContext(request);
    expect(context.countryCode).toBe("RW");
    expect(context.region).toBe("RWANDA");
    expect(context.currency).toBe("KES");
    expect(context.detectedFrom).toBe("manual");
  });

  it("falls back to a country-specific default when no override is present", () => {
    const request = new Request("https://princesbrothers.com/store/checkout", {
      headers: { "cf-ipcountry": "KE" }
    });

    const context = resolvePaymentContext(request);
    expect(context.currency).toBe("KES");
    expect(context.gateways).toContain("MPESA");
  });
});
