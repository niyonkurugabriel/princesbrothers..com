import type { AdminDriver } from "@/features/admin/server/data";

type DriverCandidate = Pick<AdminDriver, "driveCount" | "locations" | "name">;

export function driverServesLocation(driver: Pick<AdminDriver, "locations">, billingLocation: string): boolean {
  const [city = "", ...stateParts] = billingLocation.split(",");
  const cityName = city.trim().toLocaleLowerCase();
  const fullLocation = [city.trim(), stateParts.join(",").trim()].filter(Boolean).join(", ").toLocaleLowerCase();
  return driver.locations.some((location) => {
    const normalized = location.trim().toLocaleLowerCase();
    return normalized === cityName || normalized === fullLocation;
  });
}

export function sortDriversForOrder<T extends DriverCandidate>(
  drivers: T[],
  billingLocation: string,
  direction: "asc" | "desc",
): T[] {
  return [...drivers].sort((first, second) =>
    (first.driveCount - second.driveCount) * (direction === "asc" ? 1 : -1) ||
    Number(driverServesLocation(second, billingLocation)) - Number(driverServesLocation(first, billingLocation)) ||
    first.name.localeCompare(second.name)
  );
}
