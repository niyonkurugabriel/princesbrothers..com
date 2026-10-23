"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { execute, query, withTransaction } from "@princess-brothers/db";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { CURRENCY_COOKIE, resolvePaymentContext, convertAmount, type PaymentContext } from "@/features/payments/payment-context";
import { initiatePayment, type PaymentCurrency, type PaymentGateway } from "@/features/payments/payments";
import type { RowDataPacket } from "mysql2/promise";

export async function setCheckoutCurrency(currency: PaymentCurrency): Promise<{ ok: boolean; currency?: PaymentCurrency; error?: string }> {
  const allowed: PaymentCurrency[] = ["RWF", "USD", "KES", "UGX", "TZS", "BIF", "NGN", "GHS", "ZAR", "EUR", "GBP", "CAD"];
  if (!allowed.includes(currency)) return { ok: false, error: "Unsupported currency." };
  (await cookies()).set(CURRENCY_COOKIE, currency, { httpOnly: false, secure: true, sameSite: "strict", path: "/" });
  return { ok: true, currency };
}

export async function getCheckoutContext(): Promise<{ context: PaymentContext; momoPaymentCode: string }> {
  const requestHeaders = new Headers(await headers());
  const selectedCurrency = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (selectedCurrency) requestHeaders.set("cookie", `${CURRENCY_COOKIE}=${selectedCurrency}`);
  const request = new Request("https://princesbrothers.com/checkout", { headers: requestHeaders });
  const rows = await query<RowDataPacket & { value: string }>("SELECT value FROM SystemSetting WHERE settingKey = 'momo_payment_code' LIMIT 1").catch(() => []);
  return { context: resolvePaymentContext(request), momoPaymentCode: rows[0]?.value ?? "" };
}

type CheckoutInput = {
  gateway: PaymentGateway;
  items: { productId: string; quantity: number }[];
  address: { recipient: string; line1: string; city: string; postalCode: string; countryCode: string; phone: string };
  phone?: string;
  provider?: "MTN" | "Airtel" | "MTN_MOMO" | "AIRTEL_MONEY" | string;
};

export async function completeCheckoutPayment(input: CheckoutInput): Promise<{ ok: boolean; paymentId?: string; orderNumber?: string; context?: PaymentContext; authorizationUrl?: string; manualWhatsappUrl?: string; error?: string }> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "storefront" || claims.sub.startsWith("guest:")) return { ok: false, error: "Sign in to your buyer account before placing an order." };
  const buyerUserId = claims.sub;
  if (!input.items.length || input.items.length > 50 || input.items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) return { ok: false, error: "Your basket contains invalid items or quantities." };
  if ((input.gateway === "MTN_MOMO" || input.gateway === "AIRTEL_MONEY") && (!input.phone || !/^\+[1-9]\d{7,14}$/.test(input.phone.trim()))) return { ok: false, error: "Enter a valid international phone number for your mobile money payment." };
  if (input.gateway === "MTN_MOMO" && input.provider && !["MTN", "MTN_MOMO"].includes(input.provider.toUpperCase())) return { ok: false, error: "Select MTN Mobile Money for this payment." };
  if (input.gateway === "AIRTEL_MONEY" && input.provider && !["AIRTEL", "AIRTEL_MONEY"].includes(input.provider.toUpperCase())) return { ok: false, error: "Select Airtel Money for this payment." };
  const { address } = input;
  if (!address.recipient.trim() || !address.line1.trim() || !address.city.trim() || !address.postalCode.trim() || !/^[A-Z]{2}$/.test(address.countryCode) || !/^\+[1-9]\d{7,14}$/.test(address.phone)) return { ok: false, error: "Complete the delivery address and enter an international phone number." };

  const requestHeaders = new Headers(await headers());
  const selectedCurrency = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (selectedCurrency) requestHeaders.set("cookie", `${CURRENCY_COOKIE}=${selectedCurrency}`);
  const request = new Request("https://princesbrothers.com/checkout", { headers: requestHeaders });
  const context = resolvePaymentContext(request);
  if (!["MANUAL", "MTN_MOMO", "AIRTEL_MONEY"].includes(input.gateway)) return { ok: false, error: "That payment method is not supported." };
  if (input.gateway !== "MANUAL" && (address.countryCode !== "RW" || context.currency !== "RWF")) return { ok: false, error: "MTN and Airtel mobile money require a Rwanda delivery address and RWF currency. Choose manual payment or update your checkout details." };
  if (input.gateway !== "MANUAL" && !context.gateways.includes(input.gateway)) return { ok: false, error: "That payment method is not available in your region." };

  let attemptedOrderId: string | undefined;
  let attemptedPaymentId: string | undefined;
  async function recordPaymentFailure(reason: string) {
    if (!attemptedPaymentId) return;
    const now = new Date();
    await execute("UPDATE Payment SET status = 'FAILED', updatedAt = ? WHERE id = ? AND status = 'INITIATED'", [now, attemptedPaymentId]).catch(() => undefined);
    await execute("UPDATE `Order` SET status = 'CANCELLED', updatedAt = ? WHERE id = ? AND status = 'PENDING_PAYMENT'", [now, attemptedOrderId]).catch(() => undefined);
    await execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, 'Payment initialization failed', 'Payment', ?, ?)", [randomUUID(), buyerUserId, attemptedPaymentId, JSON.stringify({ reason })]).catch(() => undefined);
  }
  try {
    const users = await query<RowDataPacket & { id: string; email: string; firstName: string; lastName: string }>("SELECT id, email, firstName, lastName FROM `User` WHERE id = ? AND status = 'ACTIVE' LIMIT 1", [claims.sub]);
    const user = users[0];
    if (!user) return { ok: false, error: "Your buyer account is not active." };
    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const productRows = await query<RowDataPacket & { id: string; name: string; retailPrice: number | string; currency: PaymentCurrency; available: number | string }>(`SELECT p.id, p.name, p.retailPrice, p.currency, COALESCE(SUM(i.quantity - i.reserved), 0) AS available FROM Product p LEFT JOIN InventoryItem i ON i.productId = p.id WHERE p.id IN (${productIds.map(() => "?").join(",")}) AND p.isActive = 1 GROUP BY p.id`, productIds);
    const products = new Map(productRows.map((product) => [product.id, product]));
    if (productIds.some((id) => !products.has(id))) return { ok: false, error: "A product in your basket is no longer available." };
    const items = input.items.map((item) => ({ ...item, product: products.get(item.productId)!, unitPrice: convertAmount(Number(products.get(item.productId)!.retailPrice), products.get(item.productId)!.currency, context.currency) }));
    if (items.some((item) => Number(item.product.available) < item.quantity)) return { ok: false, error: "One or more products no longer have enough stock." };
    const subtotal = items.reduce((sum, item) => sum + convertAmount(Number(item.product.retailPrice), item.product.currency, context.currency) * item.quantity, 0);
    const shippingTotal = convertAmount(2000, "RWF", context.currency);
    const taxTotal = Number((subtotal * 0.08).toFixed(2));
    const total = Number((subtotal + shippingTotal + taxTotal).toFixed(context.currency === "RWF" ? 0 : 2));
    const orderId = randomUUID();
    const orderNumber = `PB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const paymentId = randomUUID();
    attemptedOrderId = orderId;
    attemptedPaymentId = paymentId;
    const now = new Date();
    const auditId = randomUUID();
    await withTransaction(async (transaction) => {
      const [customerRows] = await transaction.execute("SELECT id FROM Customer WHERE userId = ? LIMIT 1", [user.id]);
      const customerId = Array.isArray(customerRows) && customerRows[0] ? (customerRows[0] as { id: string }).id : randomUUID();
      if (!Array.isArray(customerRows) || !customerRows[0]) await transaction.execute("INSERT INTO Customer (id, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)", [customerId, user.id, now, now]);
      const addressId = randomUUID();
      await transaction.execute("INSERT INTO Address (id, customerId, type, recipient, line1, city, state, postalCode, countryCode, phone, createdAt, updatedAt) VALUES (?, ?, 'SHIPPING', ?, ?, ?, NULL, ?, ?, ?, ?, ?)", [addressId, customerId, address.recipient.trim(), address.line1.trim(), address.city.trim(), address.postalCode.trim(), address.countryCode, address.phone.trim(), now, now]);
      await transaction.execute("INSERT INTO `Order` (id, orderNumber, customerId, shippingAddressId, status, currency, subtotal, shippingTotal, taxTotal, total, placedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?)", [orderId, orderNumber, customerId, addressId, context.currency, subtotal, shippingTotal, taxTotal, total, now, now, now]);
      for (const item of items) await transaction.execute("INSERT INTO OrderItem (id, orderId, productId, productName, quantity, unitPrice, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?)", [randomUUID(), orderId, item.productId, item.product.name, item.quantity, item.unitPrice, item.unitPrice * item.quantity]);
      await transaction.execute("INSERT INTO Payment (id, orderId, gateway, gatewayTransactionId, status, paymentMethod, currency, amount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [paymentId, orderId, input.gateway === "MANUAL" ? "MANUAL" : "PAWAPAY", input.gateway === "MANUAL" ? null : paymentId, input.gateway === "MANUAL" ? "PENDING_APPROVAL" : "INITIATED", input.gateway, context.currency, total, now, now]);
      await transaction.execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, ?, 'Order', ?, ?)", [auditId, user.id, "Created checkout order", orderId, JSON.stringify({ orderNumber, paymentId, gateway: input.gateway, total, currency: context.currency, itemCount: items.length })]);
    });

    if (input.gateway === "MANUAL") {
      const message = encodeURIComponent(`Hello Princess & Brothers, I would like to arrange manual payment for order ${orderNumber} (${total} ${context.currency}).`);
      return { ok: true, paymentId, orderNumber, context, manualWhatsappUrl: `https://wa.me/${process.env.COMPANY_WHATSAPP_NUMBER ?? "250791702041"}?text=${message}` };
    }

    let payment: Awaited<ReturnType<typeof initiatePayment>>;
    try {
      payment = await initiatePayment(input.gateway, total, context.currency, user.email, paymentId, {
        phone: input.phone ?? address.phone,
        provider: input.provider ?? (input.gateway === "AIRTEL_MONEY" ? "Airtel" : input.gateway === "MTN_MOMO" ? "MTN" : undefined),
        metadata: {
          orderNumber,
          customerPhone: address.phone,
          shippingCountry: address.countryCode
        }
      });
    } catch (error) {
      await recordPaymentFailure(error instanceof Error ? error.message : "Mobile money initialization failed.");
      console.error("Mobile money provider could not initialize checkout payment.", error);
      return { ok: false, error: "Mobile money payment could not be started. Try again or choose manual payment." };
    }
    await execute("UPDATE Payment SET gatewayTransactionId = ?, updatedAt = ? WHERE id = ?", [payment.id, new Date(), paymentId]).catch((error) => console.error("Mobile money payment started but deposit reference update failed.", error));
    await execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, ?, 'Payment', ?, ?)", [randomUUID(), user.id, "Initialized mobile money payment", paymentId, JSON.stringify({ orderNumber, gateway: input.gateway, provider: "PAWAPAY", total, currency: context.currency })]).catch((error) => console.error("Mobile money payment started but initialization audit failed.", error));
    return { ok: true, paymentId, orderNumber, context };
  } catch (error) {
    console.error("Checkout order/payment setup failed.", error);
    await recordPaymentFailure(error instanceof Error ? error.message : "Checkout failed.");
    return { ok: false, error: "We could not create or start this order. Please try again." };
  }
}