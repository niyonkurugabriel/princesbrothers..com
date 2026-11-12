import { execute } from "@princess-brothers/db";

export async function resetDriverDriveCountForCurrentMonth(userId?: string): Promise<void> {
  const userFilter = userId ? " AND d.userId = ?" : "";
  await execute(
    `UPDATE Driver d
     LEFT JOIN driver_monthly_stats stats
       ON stats.driverId = d.id AND stats.monthStart = DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
     SET d.driveCount = COALESCE(stats.completedDeliveries, 0),
         d.driveCountMonth = DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
     WHERE (d.driveCountMonth IS NULL OR d.driveCountMonth < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'))${userFilter}`,
    userId ? [userId] : [],
  );
}

export function getDriverDriveCountForMonth(count: number | string, storedMonth: string | null, currentMonth: string): number {
  if (storedMonth !== currentMonth) return 0;
  const value = Number(count);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function isFirstDriverDeliveryCompletion(
  previousStatus: "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | null,
  nextStatus: "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
): boolean {
  return previousStatus !== "DELIVERED" && nextStatus === "DELIVERED";
}
