"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ClipboardList } from "lucide-react";
import {
  completeCheckoutPayment,
  setCheckoutCurrency,
} from "@/app/(storefront)/checkout/actions";
import {
  DEFAULT_CURRENCY,
  formatDefaultAmount,
  formatLocalAmount,
  type PaymentContext,
} from "@/features/payments/payment-context";
import type { PaymentGateway } from "@/features/payments/payments";
import {
  EmptyState,
  useCart,
} from "@/features/storefront/components/storefront";

const money = formatDefaultAmount;

export function CartView() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  if (!items.length)
    return (
      <EmptyState
        title="Your basket is ready"
        copy="Find something fresh for your table from this week’s harvest."
        action={
          <Link className="button button-navy" href="/products">
            Shop fresh produce
          </Link>
        }
      />
    );
  if (!items.length)
    return (
      <EmptyState
        title="Your basket is ready"
        copy="Find something fresh for your table from this week’s harvest."
        action={
          <Link
            className="button button-navy btn-3d btn-3d-green"
            href="/products"
          >
            Shop fresh produce
          </Link>
        }
      />
    );
  return (
    <div className="cart-layout">
      <div className="cart-lines">
        {items.map(({ product, quantity }) => (
          <div className="cart-line" key={product.id}>
            <div
              className="cart-line-image"
              style={{ backgroundImage: `url(${product.image})` }}
            />
            <div className="cart-line-info">
              <p className="eyebrow">{product.category}</p>
              <h2>{product.name}</h2>
              <span>{money(product.price)}</span>
              <button
                className="remove-link"
                type="button"
                onClick={() => removeItem(product.id)}
              >
                Remove
              </button>
            </div>
            <div className="quantity-control">
              <button
                type="button"
                aria-label={`Decrease ${product.name} quantity`}
                onClick={() => updateQuantity(product.id, quantity - 1)}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                aria-label={`Increase ${product.name} quantity`}
                onClick={() => updateQuantity(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <OrderSummary subtotal={subtotal} />
    </div>
  );
}

export function OrderSummary({
  subtotal,
  checkout = false,
  currency = DEFAULT_CURRENCY,
  fxRate = 1,
}: {
  subtotal: number;
  checkout?: boolean;
  currency?: PaymentContext["currency"];
  fxRate?: number;
}) {
  const shipping = 2000;
  const tax = subtotal * 0.08;
  const display = (amount: number) =>
    formatLocalAmount(amount * fxRate, currency);
  return (
    <aside className="order-summary">
      <p className="eyebrow">{checkout ? "Your order" : "Basket summary"}</p>
      <div className="summary-row">
        <span>Produce</span>
        <b>{display(subtotal)}</b>
      </div>
      <div className="summary-row">
        <span>Delivery</span>
        <b>{display(shipping)}</b>
      </div>
      <div className="summary-row">
        <span>Estimated tax</span>
        <b>{display(tax)}</b>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{display(subtotal + shipping + tax)}</strong>
      </div>
      {!checkout && (
        <Link className="button button-navy summary-button" href="/checkout">
          Continue to checkout <span aria-hidden="true">→</span>
        </Link>
      )}
      <p className="secure-note">
        Secure checkout · Delivery calculated for your location
      </p>
    </aside>
  );
  return (
    <aside className="order-summary">
      <p className="eyebrow">{checkout ? "Your order" : "Basket summary"}</p>
      <div className="summary-row">
        <span>Produce</span>
        <b>{display(subtotal)}</b>
      </div>
      <div className="summary-row">
        <span>Delivery</span>
        <b>{display(shipping)}</b>
      </div>
      <div className="summary-row">
        <span>Estimated tax</span>
        <b>{display(tax)}</b>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{display(subtotal + shipping + tax)}</strong>
      </div>
      {!checkout && (
        <Link
          className="button button-navy btn-3d btn-3d-green summary-button"
          href="/checkout"
        >
          Continue to checkout <span aria-hidden="true">→</span>
        </Link>
      )}
      <p className="secure-note">
        Secure checkout · Delivery calculated for your location
      </p>
    </aside>
  );
}

const checkoutPaymentMethods: { gateway: PaymentGateway; label: string; icon: "mtn" | "airtel" | "manual" }[] = [
  { gateway: "MTN_MOMO", label: "MTN Mobile Money", icon: "mtn" },
  { gateway: "AIRTEL_MONEY", label: "Airtel Money", icon: "airtel" },
  { gateway: "MANUAL", label: "Manual payment", icon: "manual" },
];

function PaymentMethodIcon({ icon }: { icon: "mtn" | "airtel" | "manual" }) {
  if (icon === "mtn") return <span className="payment-brand-icon mtn-brand-icon" aria-hidden="true">MTN</span>;
  if (icon === "airtel") return <span className="payment-brand-icon airtel-brand-icon" aria-hidden="true">A</span>;
  return <span className="payment-brand-icon manual-brand-icon" aria-hidden="true"><ClipboardList size={21} strokeWidth={1.8} /></span>;
}

export function CheckoutView({
  initialContext,
  momoPaymentCode,
}: {
  initialContext: PaymentContext;
  momoPaymentCode: string;
}) {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const visibleGateways = checkoutPaymentMethods.filter(({ gateway: method }) => initialContext.gateways.includes(method));
  const [gateway, setGateway] = useState<PaymentGateway>(visibleGateways[0]?.gateway ?? "MANUAL");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCurrencyPending, startCurrencyTransition] = useTransition();
  const [complete, setComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [manualPaymentCode, setManualPaymentCode] = useState("");
  const [manualWhatsappUrl, setManualWhatsappUrl] = useState("");
  const [mobileMoneyPaymentId, setMobileMoneyPaymentId] = useState("");
  const [mobileMoneyStatus, setMobileMoneyStatus] = useState<"pending" | "paid" | "failed" | "check">("pending");
  const [error, setError] = useState("");
  const shipping = 2000;
  const baseTotal = subtotal + shipping + subtotal * 0.08;
  const total = baseTotal;

  useEffect(() => {
    if (!complete || !mobileMoneyPaymentId || mobileMoneyStatus !== "pending") return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function checkPayment() {
      attempts += 1;
      try {
        const response = await fetch(`/api/payment/status/${encodeURIComponent(mobileMoneyPaymentId)}`, { cache: "no-store" });
        const result = await response.json() as { status?: "pending" | "paid" | "failed"; error?: string };
        if (!response.ok || !result.status) throw new Error(result.error ?? "Could not verify mobile money payment.");
        if (cancelled) return;
        if (result.status === "paid" || result.status === "failed") {
          setMobileMoneyStatus(result.status);
          return;
        }
      } catch (statusError) {
        console.error("Mobile money payment status check failed.", statusError);
      }
      if (cancelled) return;
      if (attempts >= 60) {
        setMobileMoneyStatus("check");
        return;
      }
      timer = setTimeout(checkPayment, 10000);
    }

    timer = setTimeout(checkPayment, 10000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [complete, mobileMoneyPaymentId, mobileMoneyStatus]);

  if (!items.length && !complete)
    return (
      <EmptyState
        title="There is nothing to check out"
        copy="Explore the current harvest and find something good for the table."
        action={
          <Link className="button button-navy" href="/products">
            Keep shopping
          </Link>
        }
      />
    );
  if (complete)
    return (
      <div className="checkout-complete">
        <div className="success-mark">✓</div>
        <div className="section-kicker">Order received</div>
        <h1>
          {gateway === "MANUAL"
            ? <>Your order is <em>awaiting payment.</em></>
            : mobileMoneyStatus === "paid"
              ? <>Mobile money <em>payment confirmed.</em></>
              : mobileMoneyStatus === "failed"
                ? <>Mobile money <em>payment failed.</em></>
                : mobileMoneyStatus === "check"
                  ? <>Payment is still <em>being processed.</em></>
                  : <>Approve the payment <em>on your phone.</em></>}
        </h1>
        <p>
          {gateway === "MANUAL"
            ? <>Order <strong>{orderNumber}</strong> is linked to your buyer account. We&apos;ll email your invoice after payment approval.</>
            : mobileMoneyStatus === "paid"
              ? <>Payment for order <strong>{orderNumber}</strong> is confirmed. Your invoice will be emailed to you.</>
              : mobileMoneyStatus === "failed"
                ? <>Payment for order <strong>{orderNumber}</strong> was not completed. Place a new order using manual payment or try again.</>
                : mobileMoneyStatus === "check"
                  ? <>Order <strong>{orderNumber}</strong> is still awaiting a provider confirmation. Check your order history in a moment.</>
                  : <>A payment request was sent to your phone for order <strong>{orderNumber}</strong>. Enter your mobile money PIN to approve it. This page will update automatically.</>}
        </p>
        {manualPaymentCode && (
          <p>
            MoMo payment code: <strong>{manualPaymentCode}</strong>
          </p>
        )}
        {manualWhatsappUrl && <a className="button button-navy" href={manualWhatsappUrl} target="_blank" rel="noreferrer">Continue in WhatsApp <span aria-hidden="true">→</span></a>}
        <Link className="button button-navy" href={`/orders/${orderNumber}`}>
          Track your order <span aria-hidden="true">→</span>
        </Link>
      </div>
    );

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const form = event.currentTarget;
      const field = (name: string) =>
        (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)
          ?.value ?? "";
      if ((gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") && !mobileMoneyPhone.trim()) {
        throw new Error("Enter the phone number for your mobile money payment.");
      }
      const result = await completeCheckoutPayment({
        gateway,
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
        address: {
          recipient: `${field("firstName")} ${field("lastName")}`.trim(),
          line1: field("line1"),
          city: field("city"),
          postalCode: field("postalCode"),
          countryCode: field("countryCode"),
          phone: field("phone"),
        },
        phone: (gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") ? mobileMoneyPhone : undefined,
        provider: gateway === "MTN_MOMO" ? "MTN" : gateway === "AIRTEL_MONEY" ? "Airtel" : undefined,
      });
      if (!result.ok) throw new Error(result.error);
      setOrderNumber(result.orderNumber ?? "");
      setManualPaymentCode(gateway === "MANUAL" ? momoPaymentCode : "");
      setManualWhatsappUrl(result.manualWhatsappUrl ?? "");
      setMobileMoneyPaymentId(gateway === "MANUAL" ? "" : result.paymentId ?? "");
      setMobileMoneyStatus("pending");
      clearCart();
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      setComplete(true);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "We could not start payment. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="checkout-layout" onSubmit={submitOrder}>
      <div className="checkout-form">
        <Link className="back-link" href="/cart">
          ← Back to basket
        </Link>
        <div className="checkout-header">
          <div className="section-kicker">Freshness starts here</div>
          <h1>Checkout</h1>
          <CurrencySelector
            context={context}
            pending={isCurrencyPending}
            onChange={(next) =>
              startCurrencyTransition(async () => {
                const result = await setCheckoutCurrency(next);
                if (result.ok) {
                  router.refresh();
                  setContext({
                    ...context,
                    currency: next,
                    currencySymbol: result.currency === "RWF" ? "FRw" : next,
                  });
                }
              })
            }
          />
        </div>
        <div className="account-callout">
          A buyer account is required to place an order. <Link href="/login">Sign in or create an account</Link>.
        </div>
        <fieldset>
          <legend>Contact</legend>
          <p>Payment updates and your approved invoice will be sent to your buyer account email.</p>
        </fieldset>
        <fieldset>
          <legend>Delivery address</legend>
          <div className="input-grid">
            <label>
              First name
                <input name="firstName" required placeholder="First name" />
            </label>
            <label>
              Last name
              <input name="lastName" required placeholder="Last name" />
            </label>
          </div>
          <label>
            Address
            <input name="line1" required placeholder="Street and number" />
          </label>
          <div className="input-grid">
            <label>
              City
              <input name="city" required placeholder="City" />
            </label>
            <label>
              Postal code
              <input name="postalCode" required placeholder="Postal code" />
            </label>
          </div>
          <label>
            Delivery phone
            <input name="phone" autoComplete="tel" type="tel" required pattern="\+[1-9][0-9]{7,14}" placeholder="+2507..." />
          </label>
          <label>
            Country
            <select name="countryCode" defaultValue="RW">
              <option value="RW">Rwanda</option>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
              <option value="BI">Burundi</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Payment in {context.currency}</legend>
          <div className="payment-options">
            {visibleGateways.map(({ gateway: method, label, icon }) => (
              <label
                className={
                  gateway === method
                    ? "payment-option selected"
                    : "payment-option"
                }
                key={method}
              >
                <input
                  type="radio"
                  name="gateway"
                  checked={gateway === method}
                  onChange={() => setGateway(method)}
                />
                <PaymentMethodIcon icon={icon} />
                <span>
                  <b>{label}</b>
                  <small>
                    {method === "MTN_MOMO" || method === "AIRTEL_MONEY"
                      ? "Rwanda · RWF"
                      : `Available for ${context.region.replaceAll("_", " ").toLowerCase()}`}
                  </small>
                </span>
                <strong>{context.currencySymbol}</strong>
              </label>
            ))}
          </div>
          <p className="manual-payment-alert" role="note">
            manual payment recommended before we configure other payment modes
          </p>
          {(gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") && (
            <div className="input-grid mt-3">
              <label>
                {gateway === "MTN_MOMO" ? "MTN Mobile Money phone" : "Airtel Money phone"}
                <input
                  type="tel"
                  value={mobileMoneyPhone}
                  onChange={(event) => setMobileMoneyPhone(event.target.value)}
                  placeholder="+2507..."
                  pattern="\+[1-9][0-9]{7,14}"
                  required
                />
              </label>
            </div>
          )}
          {(gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") && (
            <p className="secure-note" role="status">
              You&apos;ll be prompted to approve the payment on your phone.
            </p>
          )}
        </fieldset>
        {error && <p className="form-error">{error}</p>}
        <button
          className="button button-navy checkout-submit"
          disabled={isSubmitting || isCurrencyPending}
          type="submit"
        >
          {isSubmitting
            ? "Preparing your order…"
            : `Place order · ${formatLocalAmount(total * context.fxRate, context.currency)}`}{" "}
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </div>
      <OrderSummary
        subtotal={subtotal}
        checkout
        currency={context.currency}
        fxRate={context.fxRate}
      />
    </form>
  );
}

function CurrencySelector({
  context,
  pending,
  onChange,
}: {
  context: PaymentContext;
  pending: boolean;
  onChange: (_currency: PaymentContext["currency"]) => void;
}) {
  return (
    <label className="currency-selector">
      Currency
      <select
        disabled={pending}
        value={context.currency}
        onChange={(event) =>
          onChange(event.target.value as PaymentContext["currency"])
        }
      >
        <option value="RWF">FRw Rwandan franc</option>
        <option value="USD">$ US dollar</option>
        <option value="KES">KSh Kenyan shilling</option>
        <option value="UGX">USh Ugandan shilling</option>
        <option value="TZS">TSh Tanzanian shilling</option>
        <option value="NGN">₦ Nigerian naira</option>
        <option value="EUR">€ Euro</option>
        <option value="GBP">£ Pound sterling</option>
      </select>
    </label>
  );
}
