"use server";

import { cookies, headers } from "next/headers";
import { CURRENCY_COOKIE, resolvePaymentContext, convertAmount, type PaymentContext } from "../../../lib/payment-context";
import { initiatePayment, type PaymentCurrency, type PaymentGateway } from "../../../lib/payments";
import { logAuditEvent } from "../../../lib/audit";

export async function setCheckoutCurrency(currency: PaymentCurrency): Promise<{ ok: boolean; currency?: PaymentCurrency; error?: string }> {
  const allowed: PaymentCurrency[] = ["RWF", "USD", "KES", "UGX", "TZS", "BIF", "NGN", "GHS", "ZAR", "EUR", "GBP", "CAD"];
  if (!allowed.includes(currency)) return { ok: false, error: "Unsupported currency." };
  cookies().set(CURRENCY_COOKIE, currency, { httpOnly: false, secure: true, sameSite: "strict", path: "/" });
  return { ok: true, currency };
}

export async function getCheckoutContext(): Promise<PaymentContext> {
  const request = new Request("https://princesbrothers.com/store/checkout", { headers: headers() });
  return resolvePaymentContext(request);
}

export async function completeCheckoutPayment(input: { baseAmount: number; baseCurrency: PaymentCurrency; gateway: PaymentGateway }): Promise<{ ok: boolean; paymentId?: string; context?: PaymentContext; error?: string }> {
  const request = new Request("https://princesbrothers.com/store/checkout", { headers: headers() });
  const context = resolvePaymentContext(request);
  if (!context.gateways.includes(input.gateway)) return { ok: false, error: "That payment method is not available in your region." };
  const convertedAmount = convertAmount(input.baseAmount, input.baseCurrency, context.currency);

  try {
    const payment = await initiatePayment(input.gateway, convertedAmount, context.currency);
    await logAuditEvent({
      action: "Payment transaction initiated",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        basePrice: input.baseAmount,
        baseCurrency: input.baseCurrency,
        convertedAmount,
        convertedCurrency: context.currency,
        fxRate: context.fxRate,
        gateway: input.gateway,
        countryCode: context.countryCode,
        region: context.region,
        timestamp: new Date().toISOString()
      }
    });
    return { ok: true, paymentId: payment.id, context };
  } catch {
    return { ok: false, error: "We could not start payment. Please try again." };
  }
}