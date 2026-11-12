import { afterEach, describe, expect, it } from "vitest";
import { isValidProductImageReference } from "@/features/admin/server/product-image-storage";

const originalPublicBaseUrl = process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL;

afterEach(() => {
  if (originalPublicBaseUrl === undefined) delete process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL;
  else process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL = originalPublicBaseUrl;
});

describe("product image references", () => {
  it("allows legacy upload paths during migration", () => {
    expect(isValidProductImageReference("/uploads/products/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(true);
    expect(isValidProductImageReference("/uploads/products/../../secret.jpg")).toBe(false);
  });

  it("allows only product objects on the configured public host and path", () => {
    process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL = "https://images.example.com/store/";
    expect(isValidProductImageReference("https://images.example.com/store/products/123e4567-e89b-12d3-a456-426614174000.webp")).toBe(true);
    expect(isValidProductImageReference("https://other.example.com/store/products/123e4567-e89b-12d3-a456-426614174000.webp")).toBe(false);
    expect(isValidProductImageReference("https://images.example.com/store/profiles/123e4567-e89b-12d3-a456-426614174000.webp")).toBe(false);
    expect(isValidProductImageReference("https://images.example.com/store/products/123e4567-e89b-12d3-a456-426614174000.webp?download=1")).toBe(false);
    expect(isValidProductImageReference("http://[")).toBe(false);
  });
});
