"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

const gatewayLabels: Record<PaymentGateway, string> = {
  MTN_MOMO: "MTN MoMo",
  AIRTEL_MONEY: "Airtel Money",
  LOCAL_CARD: "Local card",
  MPESA: "M-Pesa",
  FLUTTERWAVE: "Flutterwave",
  PAYSTACK: "Paystack",
  STRIPE: "Card",
  PAYPAL: "PayPal",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  CASH_ON_DELIVERY: "Cash on delivery",
  MANUAL: "Manual",
};

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
  const [gateway, setGateway] = useState<PaymentGateway>(
    initialContext.gateways[0],
  );
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<"MTN" | "Airtel">("MTN");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCurrencyPending, startCurrencyTransition] = useTransition();
  const [complete, setComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [manualPaymentCode, setManualPaymentCode] = useState("");
  const [manualWhatsappUrl, setManualWhatsappUrl] = useState("");
  const [error, setError] = useState("");
  const shipping = 2000;
  const baseTotal = subtotal + shipping + subtotal * 0.08;
  const total = baseTotal;

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
          Your order is <em>awaiting payment.</em>
        </h1>
        <p>
          Order <strong>{orderNumber}</strong> is linked to your buyer account.
          We&apos;ll email your invoice after payment approval.
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
        provider: (gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") ? mobileMoneyProvider : undefined,
      });
      if (!result.ok) throw new Error(result.error);
      setOrderNumber(result.orderNumber ?? "");
      setManualPaymentCode(gateway === "MANUAL" ? momoPaymentCode : "");
      setManualWhatsappUrl(result.manualWhatsappUrl ?? "");
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
            {context.gateways.map((method) => (
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
                <span>
                  <b>{gatewayLabels[method]}</b>
                  <small>
                    Available for{" "}
                    {context.region.replaceAll("_", " ").toLowerCase()}
                  </small>
                </span>
                <strong>{context.currencySymbol}</strong>
              </label>
            ))}
          </div>
          {(gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") && (
            <div className="input-grid mt-3">
              <label>
                Mobile money provider
                <select
                  value={mobileMoneyProvider}
                  onChange={(event) => setMobileMoneyProvider(event.target.value as "MTN" | "Airtel")}
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="Airtel">Airtel Money</option>
                </select>
              </label>
              <label>
                Mobile money phone
                <input
                  type="tel"
                  value={mobileMoneyPhone}
                  onChange={(event) => setMobileMoneyPhone(event.target.value)}
                  placeholder={gateway === "AIRTEL_MONEY" ? "+2507..." : "+2507..."}
                  pattern="\+[1-9][0-9]{7,14}"
                  required
                />
              </label>
            </div>
          )}
          {(gateway === "MTN_MOMO" || gateway === "AIRTEL_MONEY") && (
            <p className="secure-note" role="status">
              After continuing, check your phone and approve the mobile money push prompt to complete payment.
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
  onChange: (currency: PaymentContext["currency"]) => void;
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
