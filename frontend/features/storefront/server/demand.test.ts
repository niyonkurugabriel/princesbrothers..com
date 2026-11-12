import { describe, expect, it } from "vitest";
import { productDemandScore, sortProductsByDemand } from "@/features/storefront/server/demand";

describe("product demand sorting", () => {
  it("weights each recent unit twice within the 30-day total", () => {
    expect(productDemandScore({ unitsLast7: "4", unitsLast30: "10", createdAt: new Date() })).toBe(14);
  });

  it("sorts by weighted demand, then newest product first", () => {
    const products = [
      { id: "older-tie", unitsLast7: 0, unitsLast30: 0, createdAt: new Date("2025-01-01") },
      { id: "high-demand", unitsLast7: 4, unitsLast30: 10, createdAt: new Date("2024-01-01") },
      { id: "newer-tie", unitsLast7: 0, unitsLast30: 0, createdAt: new Date("2025-02-01") },
    ];

    expect(sortProductsByDemand(products).map((product) => product.id)).toEqual([
      "high-demand",
      "newer-tie",
      "older-tie",
    ]);
  });
});
