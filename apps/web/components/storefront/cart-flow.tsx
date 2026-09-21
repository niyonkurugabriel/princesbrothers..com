"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeCheckoutPayment, setCheckoutCurrency } from "../../app/(storefront)/checkout/actions";
import { formatLocalAmount, type PaymentContext } from "../../lib/payment-context";
import type { PaymentGateway } from "../../lib/payments";
import { EmptyState, useCart } from "./storefront";

const money = (amount: number) => `$${amount.toFixed(2)}`;

export function CartView() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  if (!items.length) return <EmptyState title="Your bag is waiting" copy="Take a look around and bring home something that feels like you." action={<Link className="button button-navy" href="/store/products">Explore the collection</Link>} />;
  return <div className="cart-layout"><div className="cart-lines">{items.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div className="cart-line-image" style={{ backgroundImage: `url(${product.image})` }} /><div className="cart-line-info"><p className="eyebrow">{product.category}</p><h2>{product.name}</h2><span>{money(product.price)}</span><button className="remove-link" type="button" onClick={() => removeItem(product.id)}>Remove</button></div><div className="quantity-control"><button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity + 1)}>+</button></div></div>)}</div><OrderSummary subtotal={subtotal} /></div>;
}

export function OrderSummary({ subtotal, checkout = false, currency = "USD", fxRate = 1 }: { subtotal: number; checkout?: boolean; currency?: PaymentContext["currency"]; fxRate?: number }) {
  const shipping = subtotal >= 75 ? 0 : 8;
  const tax = subtotal * 0.08;
  const display = (amount: number) => formatLocalAmount(amount * fxRate, currency);
  return <aside className="order-summary"><p className="eyebrow">{checkout ? "Your order" : "Summary"}</p><div className="summary-row"><span>Subtotal</span><b>{display(subtotal)}</b></div><div className="summary-row"><span>Delivery</span><b>{shipping ? display(shipping) : "Free"}</b></div><div className="summary-row"><span>Estimated tax</span><b>{display(tax)}</b></div><div className="summary-total"><span>Total</span><strong>{display(subtotal + shipping + tax)}</strong></div>{!checkout && <Link className="button button-navy summary-button" href="/store/checkout">Continue to checkout <span aria-hidden="true">→</span></Link>}<p className="secure-note">Secure checkout · FX rate cached for this session</p></aside>;
}

const gatewayLabels: Record<PaymentGateway, string> = {
  MTN_MOMO: "MTN MoMo", AIRTEL_MONEY: "Airtel Money", LOCAL_CARD: "Local card", MPESA: "M-Pesa", FLUTTERWAVE: "Flutterwave", PAYSTACK: "Paystack", STRIPE: "Card", PAYPAL: "PayPal", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", CASH_ON_DELIVERY: "Cash on delivery", MANUAL: "Manual"
};

export function CheckoutView({ initialContext }: { initialContext: PaymentContext }) {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [mode, setMode] = useState<"guest" | "account">("guest");
  const [context, setContext] = useState(initialContext);
  const [gateway, setGateway] = useState<PaymentGateway>(initialContext.gateways[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCurrencyPending, startCurrencyTransition] = useTransition();
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const shipping = subtotal >= 75 ? 0 : 8;
  const baseTotal = subtotal + shipping + subtotal * 0.08;
  const total = baseTotal;

  if (!items.length && !complete) return <EmptyState title="There is nothing to check out" copy="Your bag is empty, but there is plenty to discover." action={<Link className="button button-navy" href="/store/products">Keep shopping</Link>} />;
  if (complete) return <div className="checkout-complete"><div className="success-mark">✓</div><div className="section-kicker">Thank you, truly</div><h1>Your order is <em>on its way.</em></h1><p>We&apos;ve sent confirmation details to {email || "your inbox"}. Your order number is <strong>PB-10483</strong>.</p><Link className="button button-navy" href="/store/orders/PB-10483">Track your order <span aria-hidden="true">→</span></Link></div>;

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsSubmitting(true);
    try {
      const result = await completeCheckoutPayment({ baseAmount: baseTotal, baseCurrency: "USD", gateway });
      if (!result.ok) throw new Error(result.error);
      clearCart(); setComplete(true);
    } catch (paymentError) { setError(paymentError instanceof Error ? paymentError.message : "We could not start payment. Please try again."); } finally { setIsSubmitting(false); }
  }

  return <form className="checkout-layout" onSubmit={submitOrder}><div className="checkout-form"><Link className="back-link" href="/store/cart">← Back to bag</Link><div className="checkout-header"><div className="section-kicker">Almost yours</div><h1>Checkout</h1><CurrencySelector context={context} pending={isCurrencyPending} onChange={(next) => startCurrencyTransition(async () => { const result = await setCheckoutCurrency(next); if (result.ok) { router.refresh(); setContext({ ...context, currency: next, currencySymbol: result.currency === "RWF" ? "FRw" : next }); } })} /></div><div className="checkout-tabs"><button type="button" className={mode === "guest" ? "selected" : ""} onClick={() => setMode("guest")}>Guest checkout</button><button type="button" className={mode === "account" ? "selected" : ""} onClick={() => setMode("account")}>Sign in to your account</button></div>{mode === "account" && <div className="account-callout">Account sign-in will connect your order history and saved addresses. For now, continue as a guest below.</div>}<fieldset><legend>Contact</legend><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="check-row"><input type="checkbox" /> <span>Email me with news and considered finds</span></label></fieldset><fieldset><legend>Delivery address</legend><div className="input-grid"><label>First name<input required placeholder="First name" /></label><label>Last name<input required placeholder="Last name" /></label></div><label>Address<input required placeholder="Street and number" /></label><div className="input-grid"><label>City<input required placeholder="City" /></label><label>Postal code<input required placeholder="Postal code" /></label></div><label>Country<select defaultValue="US"><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option></select></label></fieldset><fieldset><legend>Payment in {context.currency}</legend><div className="payment-options">{context.gateways.map((method) => <label className={gateway === method ? "payment-option selected" : "payment-option"} key={method}><input type="radio" name="gateway" checked={gateway === method} onChange={() => setGateway(method)} /><span><b>{gatewayLabels[method]}</b><small>Available for {context.region.replaceAll("_", " ").toLowerCase()}</small></span><strong>{context.currencySymbol}</strong></label>)}</div></fieldset>{error && <p className="form-error">{error}</p>}<button className="button button-navy checkout-submit" disabled={isSubmitting || isCurrencyPending} type="submit">{isSubmitting ? "Preparing your order…" : `Place order · ${formatLocalAmount(total * context.fxRate, context.currency)}`} {!isSubmitting && <span aria-hidden="true">→</span>}</button></div><OrderSummary subtotal={subtotal} checkout currency={context.currency} fxRate={context.fxRate} /></form>;
}

function CurrencySelector({ context, pending, onChange }: { context: PaymentContext; pending: boolean; onChange: (currency: PaymentContext["currency"]) => void }) {
  return <label className="currency-selector">Currency<select disabled={pending} value={context.currency} onChange={(event) => onChange(event.target.value as PaymentContext["currency"])}><option value="RWF">FRw Rwandan franc</option><option value="USD">$ US dollar</option><option value="KES">KSh Kenyan shilling</option><option value="UGX">USh Ugandan shilling</option><option value="TZS">TSh Tanzanian shilling</option><option value="NGN">₦ Nigerian naira</option><option value="EUR">€ Euro</option><option value="GBP">£ Pound sterling</option></select></label>;
}