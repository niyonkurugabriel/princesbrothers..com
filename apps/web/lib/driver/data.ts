import { db } from "@princess-brothers/db";

export type DriverStop = {
  id: string;
  orderNumber: string;
  address: string;
  recipient: string;
  phone: string;
  status: "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";
  codAmount: number;
  deliveryWindow: string;
};

export const demoDriverStops: DriverStop[] = [
  { id: "route-1", orderNumber: "PB-10482", address: "18 Willow Lane, Brooklyn, NY 11211", recipient: "Maya Thompson", phone: "+1 718 555 0134", status: "IN_TRANSIT", codAmount: 0, deliveryWindow: "10:00 - 11:30" },
  { id: "route-2", orderNumber: "PB-10476", address: "442 Bergen Street, Brooklyn, NY 11217", recipient: "Noah Williams", phone: "+1 718 555 0198", status: "PICKED_UP", codAmount: 64, deliveryWindow: "12:00 - 13:30" },
  { id: "route-3", orderNumber: "PB-10461", address: "73 Prospect Place, Brooklyn, NY 11238", recipient: "Ava Martinez", phone: "+1 718 555 0171", status: "DELIVERED", codAmount: 32, deliveryWindow: "14:00 - 15:30" }
];

export async function getDriverStops(driverId?: string): Promise<DriverStop[]> {
  if (!process.env.DATABASE_URL || !driverId) return demoDriverStops;

  try {
    const routes = await db.deliveryRoute.findMany({
      where: { driverId, routeDate: new Date() },
      include: {
        orders: { include: { shippingAddress: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const stops = routes.flatMap((route) => route.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      address: order.shippingAddress
        ? [order.shippingAddress.line1, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode].filter(Boolean).join(", ")
        : "Address unavailable",
      recipient: order.shippingAddress?.recipient ?? "Recipient unavailable",
      phone: order.shippingAddress?.phone ?? "",
      status: route.status,
      codAmount: 0,
      deliveryWindow: "Today"
    })));

    return stops.length ? stops : demoDriverStops;
  } catch {
    return demoDriverStops;
  }
}