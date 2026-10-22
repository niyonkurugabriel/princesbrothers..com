export type PaymentGateway =
  | "MTN_MOMO"
  | "AIRTEL_MONEY"
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
  authorizationUrl?: string;
};

export type MobileMoneyProvider = "MTN" | "Airtel";

export function toPaystackMinorAmount(amount: number, currency: PaymentCurrency | string): number {
  const normalized = String(currency).toUpperCase();
  if (["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"].includes(normalized)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

export function normalizeMobileMoneyProvider(provider?: string): MobileMoneyProvider {
  const value = String(provider ?? "MTN").trim().toUpperCase();
  if (value === "AIRTEL" || value === "AIRTEL_MONEY") return "Airtel";
  return "MTN";
}

export async function initiatePayment(
  gateway: PaymentGateway,
  amount: number,
  currency: PaymentCurrency,
  email: string,
  reference: string,
  options?: { phone?: string; provider?: MobileMoneyProvider | string; callbackUrl?: string; metadata?: Record<string, unknown> }
): Promise<PaymentIntent> {
  if (gateway === "MANUAL") return { id: reference, gateway, amount, currency, status: "requires_action" };
  if (!["MTN_MOMO", "AIRTEL_MONEY", "PAYSTACK", "LOCAL_CARD"].includes(gateway)) {
    throw new Error("That Paystack payment method is not supported.");
  }
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is required for payment.");

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");

  const isMobileMoney = gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY";
  const expectedProvider: MobileMoneyProvider = gateway === "AIRTEL_MONEY" ? "Airtel" : "MTN";
  if (isMobileMoney && options?.provider && normalizeMobileMoneyProvider(options.provider) !== expectedProvider) {
    throw new Error("The selected mobile money provider does not match the payment method.");
  }
  const normalizedProvider = expectedProvider;
  const phone = options?.phone?.replace(/\s+/g, "") ?? "";
  if (isMobileMoney && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Enter a valid international phone number for your mobile money payment.");
  }
  const channels = isMobileMoney ? ["mobile_money"] : ["card"];
  const callbackUrl = options?.callbackUrl ?? `${process.env.APP_URL ?? "https://www.princesbrothers.com"}/api/payment/verify/${encodeURIComponent(reference)}`;

  const payload: Record<string, unknown> = {
    email,
    amount: toPaystackMinorAmount(amount, currency),
    currency,
    reference,
    channels,
    callback_url: callbackUrl,
    metadata: {
      ...(options?.metadata ?? {}),
      gateway,
      channel: isMobileMoney ? "mobile_money" : "card",
      mobileMoneyProvider: normalizedProvider,
      phone: phone || undefined,
      paystackMode: "hosted-checkout"
    }
  };

  if (isMobileMoney) {
    payload.mobile_money = {
      provider: normalizedProvider,
      phone: phone || undefined
    };
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };

  if (!response.ok || !result.status || !result.data?.authorization_url) {
    throw new Error(result.message ?? "Paystack could not initialize this transaction.");
  }

  return {
    id: result.data.reference ?? reference,
    gateway,
    amount,
    currency,
    status: "requires_action",
    authorizationUrl: result.data.authorization_url
  };
}
