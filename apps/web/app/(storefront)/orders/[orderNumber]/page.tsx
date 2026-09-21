import { OrderTracking } from "../../../../components/storefront/order-tracking";
import { getTrackingOrder } from "../../../../lib/storefront/data";

export default async function OrderTrackingPage({ params }: { params: { orderNumber: string } }) {
  const order = await getTrackingOrder(params.orderNumber);
  return <main className="tracking-page content-width"><OrderTracking order={order} /></main>;
}