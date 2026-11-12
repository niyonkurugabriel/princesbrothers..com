import { describe, expect, it } from "vitest";
import { normalizeCategoryInput, parseProductTags } from "@/features/admin/server/product-metadata";

describe("product metadata", () => {
  it("normalizes category names and optional slugs", () => {
    expect(normalizeCategoryInput("  Fresh   Fruit ", "Fresh-Fruit")).toEqual({
      ok: true,
      name: "Fresh Fruit",
      slug: "fresh-fruit",
    });
    expect(normalizeCategoryInput(" ", "")).toEqual({
      ok: false,
      error: "Enter a category name up to 120 characters.",
    });
    expect(normalizeCategoryInput("Fruit", "fresh--fruit").ok).toBe(false);
  });

  it("trims and deduplicates tags without case sensitivity", () => {
    expect(parseProductTags(JSON.stringify(["Organic", " organic ", "Seasonal"]))).toEqual(["Organic", "Seasonal"]);
  });

  it("rejects malformed or oversized tag lists", () => {
    expect(parseProductTags("{invalid")).toBeNull();
    expect(parseProductTags(JSON.stringify(Array.from({ length: 21 }, (_, index) => `tag-${index}`)))).toBeNull();
    expect(parseProductTags(JSON.stringify(["x".repeat(81)]))).toBeNull();
  });
});
