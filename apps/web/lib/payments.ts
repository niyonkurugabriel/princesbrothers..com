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
};

export async function initiatePayment(
  gateway: PaymentGateway,
  amount: number,
  currency: PaymentCurrency,
): Promise<PaymentIntent> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return {
    id: `mock_pi_${Date.now()}`,
    gateway,
    amount,
    currency,
    status: gateway === "CASH_ON_DELIVERY" ? "succeeded" : "requires_action"
  };
}