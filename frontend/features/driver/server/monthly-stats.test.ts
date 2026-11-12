import { describe, expect, it } from "vitest";
import { getDriverDriveCountForMonth, isFirstDriverDeliveryCompletion } from "@/features/driver/server/monthly-stats";

describe("driver monthly drive count", () => {
  it("returns the stored count only for the current month", () => {
    expect(getDriverDriveCountForMonth(7, "2026-03-01", "2026-03-01")).toBe(7);
    expect(getDriverDriveCountForMonth("7", "2026-02-01", "2026-03-01")).toBe(0);
    expect(getDriverDriveCountForMonth(-1, "2026-03-01", "2026-03-01")).toBe(0);
  });

  it("counts only the first transition to delivered", () => {
    expect(isFirstDriverDeliveryCompletion("IN_TRANSIT", "DELIVERED")).toBe(true);
    expect(isFirstDriverDeliveryCompletion("DELIVERED", "DELIVERED")).toBe(false);
    expect(isFirstDriverDeliveryCompletion(null, "IN_TRANSIT")).toBe(false);
  });
});
