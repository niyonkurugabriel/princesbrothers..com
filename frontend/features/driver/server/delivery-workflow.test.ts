import { describe, expect, it } from "vitest";
import { canAdvanceDriverDelivery, matchesBuyerOrderNumber } from "@/features/driver/server/delivery-workflow";

describe("driver delivery workflow", () => {
  it("requires pickup approval and sequential delivery progress", () => {
    expect(canAdvanceDriverDelivery(null, "PICKED_UP")).toBe(true);
    expect(canAdvanceDriverDelivery("PICKED_UP", "IN_TRANSIT")).toBe(true);
    expect(canAdvanceDriverDelivery("IN_TRANSIT", "DELIVERED")).toBe(true);
    expect(canAdvanceDriverDelivery(null, "DELIVERED")).toBe(false);
    expect(canAdvanceDriverDelivery("PICKED_UP", "DELIVERED")).toBe(false);
    expect(canAdvanceDriverDelivery("DELIVERED", "IN_TRANSIT")).toBe(false);
  });

  it("matches the buyer's order number ignoring surrounding spaces and case", () => {
    expect(matchesBuyerOrderNumber("PB-123", " pb-123 ")).toBe(true);
    expect(matchesBuyerOrderNumber("PB-123", "PB-124")).toBe(false);
    expect(matchesBuyerOrderNumber("PB-123", "")).toBe(false);
  });
});
