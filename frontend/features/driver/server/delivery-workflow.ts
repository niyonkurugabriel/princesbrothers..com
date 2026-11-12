export type DriverDeliveryStatus = "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";

export function canAdvanceDriverDelivery(
  previousStatus: DriverDeliveryStatus | null,
  nextStatus: DriverDeliveryStatus,
): boolean {
  if (previousStatus === nextStatus) return true;
  const progress: Record<DriverDeliveryStatus, number> = {
    PICKED_UP: 0,
    IN_TRANSIT: 1,
    DELIVERED: 2,
  };
  return previousStatus === null
    ? nextStatus === "PICKED_UP"
    : progress[nextStatus] === progress[previousStatus] + 1;
}

export function matchesBuyerOrderNumber(orderNumber: string, buyerOrderNumber: string): boolean {
  return orderNumber.trim().toUpperCase() === buyerOrderNumber.trim().toUpperCase();
}
