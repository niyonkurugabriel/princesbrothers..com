import { NextResponse } from "next/server";
import { query } from "@princess-brothers/db";
import { approvePayment } from "@/features/payments/server/invoices";
import type { RowDataPacket } from "mysql2/promise";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref");
  const appUrl = process.env.APP_URL ?? "https://www.princesbrothers.com";
  if (!reference || !process.env.PAYSTACK_SECRET_KEY) return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: "no-store" });
    const result = await response.json() as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; reference?: string } };
    if (!response.ok || !result.status || result.data?.status !== "success" || result.data.reference !== reference) return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
    const rows = await query<RowDataPacket & { id: string; amount: number | string; currency: string }>("SELECT id, amount, currency FROM Payment WHERE gatewayTransactionId = ? AND gateway = 'PAYSTACK' LIMIT 1", [reference]);
    const payment = rows[0];
    if (!payment || Math.round(Number(payment.amount) * 100) !== result.data.amount || payment.currency !== result.data.currency) return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
    const approval = await approvePayment(payment.id);
    return NextResponse.redirect(new URL(approval.ok ? "/orders?payment=approved" : "/orders?payment=pending", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/orders?payment=pending", appUrl));
  }
}