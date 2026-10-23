export type PaymentGateway =
  | "MTN_MOMO"
  | "AIRTEL_MONEY"
  | "PAWAPAY"
  | "LOCAL_CARD"
  | "MPESA"
  | "FLUTTERWAVE"
  | "PAYSTACK"
  | "STRIPE"
  | "PAYPAL"
  | "APPLE_PAY"
  | "GOOGLE_PAY"
  | "CASH_ON_DELIVERY"
  | "MANUAL";
export type PaymentCurrency = "RWF" | "USD" | "KES" | "UGX" | "TZS" | "BIF" | "NGN" | "GHS" | "ZAR" | "EUR" | "GBP" | "CAD";

export type PaymentIntent = {
  id: string;
  gateway: PaymentGateway;
  amount: number;
  currency: PaymentCurrency;
  status: "requires_action" | "succeeded";
};

export type MobileMoneyProvider = "MTN" | "Airtel";

export function toPaystackMinorAmount(amount: number, currency: PaymentCurrency | string): number {
  const normalized = String(currency).toUpperCase();
  if (["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"].includes(normalized)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

export function toPawaPayAmount(amount: number, currency: PaymentCurrency | string): string {
  if (currency.toUpperCase() !== "RWF") throw new Error("PawaPay mobile money payments are only enabled in RWF.");
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("PawaPay requires a positive whole-number RWF amount.");
  return String(amount);
}

export function pawaPayApiBaseUrl(): URL {
  const value = process.env.PAWAPAY_API_URL || "https://api.pawapay.io";
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !["api.pawapay.io", "api.sandbox.pawapay.io"].includes(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("PAWAPAY_API_URL must be https://api.pawapay.io or https://api.sandbox.pawapay.io.");
  }
  return url;
}

export async function initiatePayment(
  gateway: PaymentGateway,
  amount: number,
  currency: PaymentCurrency,
  _email: string,
  reference: string,
  options?: { phone?: string; provider?: MobileMoneyProvider | string; metadata?: Record<string, unknown> }
): Promise<PaymentIntent> {
  if (gateway === "MANUAL") return { id: reference, gateway, amount, currency, status: "requires_action" };
  if (gateway !== "MTN_MOMO" && gateway !== "AIRTEL_MONEY") {
    throw new Error("That mobile money payment method is not supported.");
  }

  const apiToken = process.env.PAWAPAY_API_TOKEN;
  if (!apiToken) throw new Error("The mobile money payment provider is not configured.");
  const amountString = toPawaPayAmount(amount, currency);
  const provider: MobileMoneyProvider = gateway === "AIRTEL_MONEY" ? "Airtel" : "MTN";
  if (options?.provider && options.provider.toUpperCase() !== provider.toUpperCase()) {
    throw new Error("The selected mobile money provider does not match the payment method.");
  }

  const phone = options?.phone?.replace(/\s+/g, "") ?? "";
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Enter a valid international phone number for your mobile money payment.");
  }

  const orderNumber = options?.metadata?.orderNumber;
  const providerCode = gateway === "AIRTEL_MONEY" ? "AIRTEL_RWA" : "MTN_MOMO_RWA";
  const payload = {
    depositId: reference,
    amount: amountString,
    currency,
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: phone.slice(1),
        provider: providerCode
      }
    },
    ...(typeof orderNumber === "string" ? { clientReferenceId: orderNumber } : {})
  };

  const response = await fetch(new URL("/v2/deposits", pawaPayApiBaseUrl()), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const result = await response.json() as {
    depositId?: string;
    status?: string;
    rejectionReason?: { rejectionMessage?: string };
    failureReason?: { failureMessage?: string };
  };

  if (!response.ok || result.status !== "ACCEPTED") {
    throw new Error(result.rejectionReason?.rejectionMessage ?? result.failureReason?.failureMessage ?? "The mobile money provider could not accept this payment.");
  }

  return {
    id: result.depositId ?? reference,
    gateway,
    amount,
    currency,
    status: "requires_action"
  };
}
