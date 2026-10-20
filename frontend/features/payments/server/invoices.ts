import { randomUUID } from "node:crypto";
import { execute, query, withTransaction } from "@princess-brothers/db";
import { sendEmail } from "@/features/auth/providers";
import type { RowDataPacket } from "mysql2/promise";

type PaymentRow = RowDataPacket & { id: string; orderId: string; orderNumber: string; status: string; total: number | string; currency: string; email: string; firstName: string; lastName: string };

export async function approvePayment(paymentId: string, actorId?: string): Promise<{ ok: boolean; invoiceSent?: boolean; error?: string }> {
  const rows = await query<PaymentRow>("SELECT p.id, p.orderId, p.status, o.orderNumber, o.total, o.currency, u.email, u.firstName, u.lastName FROM Payment p JOIN `Order` o ON o.id = p.orderId JOIN Customer c ON c.id = o.customerId JOIN `User` u ON u.id = c.userId WHERE p.id = ? LIMIT 1", [paymentId]);
  const payment = rows[0];
  if (!payment) return { ok: false, error: "Payment was not found." };
  if (payment.status === "PAID") return { ok: true };
  if (!actorId && payment.status !== "INITIATED") return { ok: false, error: "This payment is not awaiting Paystack confirmation." };
  if (actorId && payment.status !== "PENDING_APPROVAL") return { ok: false, error: "Only manual payments awaiting review can be approved here." };

  const now = new Date();
  try {
    await withTransaction(async (transaction) => {
      const [paymentResult] = await transaction.execute("UPDATE Payment SET status = 'PAID', paidAt = ?, updatedAt = ? WHERE id = ? AND status = ?", [now, now, paymentId, payment.status]);
      if (Number((paymentResult as { affectedRows?: number }).affectedRows ?? 0) !== 1) throw new Error("Payment status changed before approval.");
      await transaction.execute("UPDATE `Order` SET status = 'PAID', updatedAt = ? WHERE id = ? AND status = 'PENDING_PAYMENT'", [now, payment.orderId]);
      await transaction.execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, ?, 'Payment', ?, ?)", [randomUUID(), actorId ?? null, actorId ? "Approved manual payment" : "Confirmed Paystack payment", paymentId, JSON.stringify({ orderNumber: payment.orderNumber, amount: Number(payment.total), currency: payment.currency })]);
    });
  } catch {
    return { ok: false, error: "Payment approval could not be recorded." };
  }

  try {
    const items = await query<RowDataPacket & { productName: string; quantity: number; unitPrice: number | string; lineTotal: number | string }>("SELECT productName, quantity, unitPrice, lineTotal FROM OrderItem WHERE orderId = ? ORDER BY id", [payment.orderId]);
    const lines = items.map((item) => `${item.quantity} x ${item.productName}: ${payment.currency} ${Number(item.lineTotal).toFixed(2)}`);
    await sendEmail(payment.email, `Princess & Brothers invoice ${payment.orderNumber}`, [
      `Hello ${payment.firstName} ${payment.lastName},`,
      "Your payment has been approved. Here is your invoice:",
      `Order: ${payment.orderNumber}`,
      ...lines,
      `Total paid: ${payment.currency} ${Number(payment.total).toFixed(2)}`,
      "Thank you for shopping with Princess & Brothers."
    ].join("\n"));
    return { ok: true, invoiceSent: true };
  } catch (error) {
    await execute("INSERT INTO AuditLog (id, action, entityType, entityId, metadata) VALUES (?, 'Invoice email delivery failed', 'Order', ?, ?)", [randomUUID(), payment.orderId, JSON.stringify({ orderNumber: payment.orderNumber, reason: error instanceof Error ? error.message : "Unknown email error" })]);
    return { ok: true, invoiceSent: false };
  }
}