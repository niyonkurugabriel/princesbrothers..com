import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@princess-brothers/db";
import { approvePayment } from "@/features/payments/server/invoices";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const rawBody = await request.text();
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "hex"); } catch { return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 }); }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string } };
  if (event.event !== "charge.success" || !event.data?.reference || event.data.status !== "success") return NextResponse.json({ received: true });
  const rows = await query<RowDataPacket & { id: string; amount: number | string; currency: string }>("SELECT id, amount, currency FROM Payment WHERE gatewayTransactionId = ? AND gateway = 'PAYSTACK' LIMIT 1", [event.data.reference]);
  const payment = rows[0];
  if (!payment || Math.round(Number(payment.amount) * 100) !== event.data.amount || payment.currency !== event.data.currency) return NextResponse.json({ error: "Payment reference or amount does not match." }, { status: 400 });
  const result = await approvePayment(payment.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ received: true });
}