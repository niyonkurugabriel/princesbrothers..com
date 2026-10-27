import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { formatLocalAmount } from "@/features/payments/payment-context";
import { getCustomerOrders } from "@/features/storefront/server/data";

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function OrderHistoryPage() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "storefront" || claims.sub.startsWith("guest:")) {
    redirect("/login?returnTo=%2Forders");
  }

  const orders = await getCustomerOrders(claims.sub);
  return <main className="account-page content-width">
    <div className="section-kicker">Your account</div>
    <h1>Order <em>history.</em></h1>
    <p className="account-page-copy">Review the orders placed with your Princess & Brothers account.</p>
    {orders.length ? <div className="order-history-list">{orders.map((order) => <article className="order-history-row" key={order.orderNumber}>
      <div><p className="eyebrow">{order.placedAt}</p><h2>{order.orderNumber}</h2><span>{order.status}</span></div>
      <strong>{formatLocalAmount(order.total, order.currency as Parameters<typeof formatLocalAmount>[1])}</strong>
      <Link className="text-link" href={`/orders/${order.orderNumber}`}>View order <span aria-hidden="true">→</span></Link>
    </article>)}</div> : <div className="empty-state"><h2>No orders yet</h2><p>Your completed orders will appear here.</p><Link className="button button-navy btn-3d btn-3d-green" href="/products">Shop fresh produce</Link></div>}
  </main>;
}