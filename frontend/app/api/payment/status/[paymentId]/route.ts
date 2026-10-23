import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { execute, query } from "@princess-brothers/db";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { pawaPayApiBaseUrl } from "@/features/payments/payments";
import { approvePayment } from "@/features/payments/server/invoices";
import type { RowDataPacket } from "mysql2/promise";

type PaymentRow = RowDataPacket & {
  id: string;
  gatewayTransactionId: string;
  amount: number | string;
  currency: string;
  status: string;
};

type DepositStatus = {
  status?: string;
  data?: {
    depositId?: string;
    status?: string;
    amount?: string;
    currency?: string;
  };
};

export async function GET(_request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    const claims = token ? await verifyActiveSession(token) : null;
    if (!claims || claims.portal !== "storefront" || claims.sub.startsWith("guest:")) {
      return NextResponse.json({ error: "Sign in to check your payment status." }, { status: 401 });
    }

    const { paymentId } = await context.params;
    const rows = await query<PaymentRow>(
      "SELECT p.id, p.gatewayTransactionId, p.amount, p.currency, p.status FROM Payment p JOIN `Order` o ON o.id = p.orderId JOIN Customer c ON c.id = o.customerId WHERE p.id = ? AND p.gateway = 'PAWAPAY' AND c.userId = ? LIMIT 1",
      [paymentId, claims.sub]
    );
    const payment = rows[0];
    if (!payment) return NextResponse.json({ error: "Payment was not found." }, { status: 404 });
    if (payment.status === "PAID") return NextResponse.json({ status: "paid" });
    if (payment.status !== "INITIATED") return NextResponse.json({ status: "failed" });

    const tokenValue = process.env.PAWAPAY_API_TOKEN;
    if (!tokenValue) throw new Error("PAWAPAY_API_TOKEN is not configured.");
    const response = await fetch(
      new URL(`/v2/deposits/${encodeURIComponent(payment.gatewayTransactionId)}`, pawaPayApiBaseUrl()),
      {
        headers: { Authorization: `Bearer ${tokenValue}`, Accept: "application/json" },
        cache: "no-store"
      }
    );
    const result = await response.json() as DepositStatus;
    if (!response.ok) {
      throw new Error(`PawaPay status request failed with HTTP ${response.status}.`);
    }
    if (result.status === "NOT_FOUND" || result.data?.depositId !== payment.gatewayTransactionId) {
      return NextResponse.json({ error: "The payment provider could not find this deposit." }, { status: 502 });
    }

    if (
      result.status !== "FOUND" ||
      !result.data.status ||
      result.data.amount === undefined ||
      !result.data.currency ||
      Number(result.data.amount) !== Number(payment.amount) ||
      result.data.currency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      console.error("PawaPay deposit amount or currency did not match the stored payment.", { paymentId: payment.id });
      return NextResponse.json({ error: "The provider payment details do not match this order." }, { status: 409 });
    }

    if (result.data?.status === "COMPLETED") {
      const approval = await approvePayment(payment.id);
      if (!approval.ok) throw new Error(approval.error ?? "Completed mobile money payment could not be recorded.");
      return NextResponse.json({ status: "paid" });
    }

    if (result.data?.status === "FAILED") {
      const now = new Date();
      await execute("UPDATE Payment SET status = 'FAILED', updatedAt = ? WHERE id = ? AND status = 'INITIATED'", [now, payment.id]);
      await execute("UPDATE `Order` SET status = 'CANCELLED', updatedAt = ? WHERE id = (SELECT orderId FROM Payment WHERE id = ?) AND status = 'PENDING_PAYMENT'", [now, payment.id]);
      return NextResponse.json({ status: "failed" });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Mobile money payment status could not be checked.", error);
    return NextResponse.json({ error: "Payment status is temporarily unavailable." }, { status: 503 });
  }
}
