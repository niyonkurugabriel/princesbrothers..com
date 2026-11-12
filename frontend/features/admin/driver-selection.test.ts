import { describe, expect, it } from "vitest";
import { driverServesLocation, sortDriversForOrder } from "@/features/admin/driver-selection";
import type { AdminDriver } from "@/features/admin/server/data";

function driver(id: string, driveCount: number, locations: string[] = []): AdminDriver {
  return {
    id,
    name: id,
    phone: "",
    photoUrl: "",
    vehicleInfo: "",
    status: "ACTIVE",
    availability: "Available",
    driveCount,
    locations,
    recentDeliveries: [],
  };
}

describe("driver selection", () => {
  it("sorts by monthly count first and reverses the count direction on request", () => {
    const drivers = [driver("busy", 8), driver("local", 2, ["Kigali"]), driver("other", 2)];

    expect(sortDriversForOrder(drivers, "Kigali, Kigali", "asc").map(({ id }) => id)).toEqual(["local", "other", "busy"]);
    expect(sortDriversForOrder(drivers, "Kigali, Kigali", "desc").map(({ id }) => id)).toEqual(["busy", "local", "other"]);
  });

  it("matches exact city or city/state service locations, not prefixes", () => {
    expect(driverServesLocation(driver("city", 0, [" Kigali "]), "Kigali, Kigali")).toBe(true);
    expect(driverServesLocation(driver("full", 0, ["Kigali, Kigali"]), "Kigali, Kigali")).toBe(true);
    expect(driverServesLocation(driver("prefix", 0, ["Kig"]), "Kigali, Kigali")).toBe(false);
  });
});
