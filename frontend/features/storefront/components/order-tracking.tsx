import Link from "next/link";
import { formatLocalAmount } from "@/features/payments/payment-context";
import type { TrackingOrder } from "@/features/storefront/server/data";

const steps = ["Order placed", "Packed with care", "In transit", "Delivered"];

export function OrderTracking({ order }: { order: TrackingOrder | null }) {
  if (!order)
    return (
      <div className="tracking-empty">
        <div className="section-kicker">Find your order</div>
        <h1>
          That order number
          <br />
          <em>isn&apos;t here yet.</em>
        </h1>
        <p>Check the number in your confirmation email and try again.</p>
        <Link className="button button-navy" href="/">
          Back to the shop
        </Link>
      </div>
    );
  const currentStep =
    order.status === "In transit" ? 2 : order.status === "Delivered" ? 4 : 1;
  const subtotal = order.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.08;
  const shipping = order.total - subtotal - tax;
  return (
    <div className="tracking-layout">
      <div className="tracking-main">
        <Link className="back-link" href="/">
          ← Back to shop
        </Link>
        <div className="section-kicker">Order {order.orderNumber}</div>
        <h1>
          On its way to <em>you.</em>
        </h1>
        <p className="tracking-lead">
          Estimated delivery <strong>{order.estimatedDelivery}</strong>
        </p>
        <div className="tracking-status">
          <div className="status-header">
            <span className="status-pip" /> <b>{order.status}</b>
            <span>Updated just now</span>
          </div>
          <div className="tracking-line">
            {steps.map((step, index) => (
              <div
                className={
                  index < currentStep
                    ? "tracking-step complete"
                    : index === currentStep
                      ? "tracking-step current"
                      : "tracking-step"
                }
                key={step}
              >
                <span className="step-dot">
                  {index < currentStep ? "✓" : index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tracking-detail">
          <div>
            <div className="section-kicker">Order contents</div>
            <h2>A little something for you</h2>
          </div>
          {order.items.map((item) => (
            <div className="tracked-item" key={item.name}>
              <div
                className="tracked-item-image"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <div>
                <b>{item.name}</b>
                <span>Qty {item.quantity}</span>
              </div>
              <strong>{formatLocalAmount(item.price * item.quantity, order.currency as Parameters<typeof formatLocalAmount>[1])}</strong>
            </div>
          ))}
        </div>
      </div>
      <aside className="tracking-aside">
        <div className="aside-card">
          <p className="eyebrow">Transaction summary</p>
          <div className="summary-row">
            <span>Subtotal</span>
            <b>{formatLocalAmount(subtotal, order.currency as Parameters<typeof formatLocalAmount>[1])}</b>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <b>{formatLocalAmount(shipping, order.currency as Parameters<typeof formatLocalAmount>[1])}</b>
          </div>
          <div className="summary-row">
            <span>Estimated tax</span>
            <b>{formatLocalAmount(tax, order.currency as Parameters<typeof formatLocalAmount>[1])}</b>
          </div>
          <div className="summary-total">
            <span>Order total</span>
            <strong>{formatLocalAmount(order.total, order.currency as Parameters<typeof formatLocalAmount>[1])}</strong>
          </div>
          <p className="payment-status">Payment status: {(order.paymentStatus ?? "NOT STARTED").replaceAll("_", " ").toLowerCase()}</p>
          <p className="payment-status">Method: {(order.paymentMethod ?? "Not selected").replaceAll("_", " ")}</p>
          {order.paymentReference && <p className="payment-status">Transaction reference: {order.paymentReference}</p>}
          <div className="address-placeholder">
            <span className="mini-icon">⌂</span>
            <div>
              <b>Shipping address</b>
              <p>
                Guest checkout
                <br />
                Address provided at checkout
              </p>
            </div>
          </div>
          <div className="address-placeholder">
            <span className="mini-icon">♡</span>
            <div>
              <b>Need help?</b>
              <p>hello@princesbrothers.com</p>
            </div>
          </div>
        </div>
        <Link className="text-link" href="/products">
          Continue shopping <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </div>
  );
}
