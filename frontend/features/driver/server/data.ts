import { query } from "@princess-brothers/db";
import type { RowDataPacket } from "mysql2/promise";

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

type DriverStopRow = RowDataPacket & {
  id: string; orderNumber: string; line1: string | null; city: string | null; state: string | null;
  postalCode: string | null; recipient: string | null; phone: string | null; status: DriverStop["status"];
};

export type DriverPayoutAccount = {
  id: string;
  provider: string;
  accountHolder: string;
  accountPhone: string;
};

export type DriverProfile = {
  name: string;
  phone: string;
  vehicleInfo: string;
  locations: string[];
  payoutAccounts: DriverPayoutAccount[];
};

export async function getDriverProfile(userId: string): Promise<DriverProfile> {
  const driverRows = await query<RowDataPacket & { id: string; firstName: string; lastName: string; phone: string | null; vehicleInfo: string | null }>(
    "SELECT d.id, u.firstName, u.lastName, u.phone, d.vehicleInfo FROM Driver d JOIN `User` u ON u.id = d.userId WHERE d.userId = ? LIMIT 1",
    [userId],
  );
  const driver = driverRows[0];
  if (!driver) throw new Error("Driver account was not found.");
  const [locationRows, payoutAccounts] = await Promise.all([
    query<RowDataPacket & { locationName: string }>(
      "SELECT locationName FROM DriverLocation WHERE driverId = ? ORDER BY locationName",
      [driver.id],
    ),
    query<RowDataPacket & DriverPayoutAccount>(
      "SELECT id, provider, accountHolder, accountPhone FROM DriverPayoutAccount WHERE driverId = ? ORDER BY createdAt",
      [driver.id],
    ),
  ]);
  return {
    name: `${driver.firstName} ${driver.lastName}`.trim(),
    phone: driver.phone ?? "",
    vehicleInfo: driver.vehicleInfo ?? "",
    locations: locationRows.map((row) => row.locationName),
    payoutAccounts,
  };
}

export async function getDriverStops(driverId?: string): Promise<DriverStop[]> {
  if (!process.env.DATABASE_URL || !driverId) return [];

  const rows = await query<DriverStopRow>("SELECT o.id, o.orderNumber, a.line1, a.city, a.state, a.postalCode, a.recipient, a.phone, COALESCE(o.deliveryStatus, dr.status) AS status FROM DeliveryRoute dr JOIN Driver d ON d.id = dr.driverId JOIN `Order` o ON o.routeId = dr.id LEFT JOIN Address a ON a.id = o.shippingAddressId WHERE d.userId = ? AND dr.routeDate = CURRENT_DATE ORDER BY dr.createdAt ASC", [driverId]);
  return rows.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    address: [order.line1, order.city, order.state, order.postalCode].filter(Boolean).join(", ") || "Address unavailable",
    recipient: order.recipient ?? "Recipient unavailable",
    phone: order.phone ?? "",
    status: order.status,
    codAmount: 0,
    deliveryWindow: "Today"
  }));
}