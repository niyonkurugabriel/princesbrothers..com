import { cookies } from "next/headers";
import { OrderTracking } from "@/features/storefront/components/order-tracking";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { getTrackingOrder } from "@/features/storefront/server/data";

export default async function OrderTrackingPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  let claims = null;
  if (token) {
    try {
      claims = await verifyActiveSession(token);
    } catch {
      claims = null;
    }
  }
  const order = claims?.portal === "storefront" && !claims.sub.startsWith("guest:")
    ? await getTrackingOrder(orderNumber, claims.sub)
    : null;
  return <main className="tracking-page content-width"><OrderTracking order={order} /></main>;
}