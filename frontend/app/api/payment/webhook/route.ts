import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@princess-brothers/db";
import { approvePayment } from "@/features/payments/server/invoices";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");

  if (!secret || !signature) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const provided = signature.trim();

  const equal = provided.length === expected.length && timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  if (!equal) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (!event || !event.event) {
    return NextResponse.json({ received: true });
  }

  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ received: true, ignored: event.event ?? "unknown" });
  }

  const rows = await query<RowDataPacket & { id: string; amount: number | string; currency: string }>(
    "SELECT id, amount, currency FROM Payment WHERE gatewayTransactionId = ? AND gateway = 'PAYSTACK' LIMIT 1",
    [event.data.reference]
  );

  const payment = rows[0];
  if (!payment) {
    return NextResponse.json({ received: true, unresolvedReference: event.data.reference });
  }

  const expectedAmount = Math.round(Number(payment.amount) * 100);
  if (expectedAmount !== Number(event.data.amount ?? 0) || String(payment.currency).toUpperCase() !== String(event.data.currency ?? "").toUpperCase()) {
    return NextResponse.json({ error: "Payment reference or amount does not match." }, { status: 400 });
  }

  const result = await approvePayment(payment.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Payment approval failed." }, { status: 409 });
  }

  return NextResponse.json({ received: true, approved: true, reference: event.data.reference });
}
