import { NextResponse } from "next/server";
import { query } from "@princess-brothers/db";
import { toPaystackMinorAmount } from "@/features/payments/payments";
import { approvePayment } from "@/features/payments/server/invoices";
import type { RowDataPacket } from "mysql2/promise";

export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  const params = await context.params;
  const reference = decodeURIComponent(params.reference ?? "");
  const appUrl = process.env.APP_URL ?? "https://www.princesbrothers.com";

  if (!reference) {
    return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secret}`
      },
      cache: "no-store"
    });

    const result = (await response.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string; reference?: string };
      message?: string;
    };

    if (!response.ok || !result.status || result.data?.status !== "success" || result.data.reference !== reference) {
      return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
    }

    const rows = await query<RowDataPacket & { id: string; amount: number | string; currency: string }>(
      "SELECT id, amount, currency FROM Payment WHERE gatewayTransactionId = ? AND gateway = 'PAYSTACK' LIMIT 1",
      [reference]
    );

    const payment = rows[0];
    if (!payment) {
      return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
    }

    const expectedAmount = toPaystackMinorAmount(Number(payment.amount), payment.currency);
    if (expectedAmount !== Number(result.data.amount ?? 0) || String(payment.currency).toUpperCase() !== String(result.data.currency ?? "").toUpperCase()) {
      return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
    }

    const approval = await approvePayment(payment.id);
    return NextResponse.redirect(new URL(approval.ok ? "/orders?payment=approved" : "/orders?payment=pending", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
  }
}
