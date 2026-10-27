import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getProducts: vi.fn() }));

vi.mock("@/features/storefront/server/data", () => ({ getProducts: mocks.getProducts }));

import { GET } from "@/app/sitemap.xml/route";

describe("sitemap route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://www.princesbrothers.com");
    mocks.getProducts.mockResolvedValue([{
      id: "product & one",
      name: "Fresh <Avocados>",
      description: "Local & freshly harvested",
      image: "/products/avocado harvest.jpg"
    }]);
  });

  it("returns canonical public routes and escaped product image metadata", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(xml).toContain("<loc>https://www.princesbrothers.com/</loc>");
    expect(xml).toContain("<loc>https://www.princesbrothers.com/products/product%20%26%20one</loc>");
    expect(xml).toContain("<image:loc>https://www.princesbrothers.com/products/avocado%20harvest.jpg</image:loc>");
    expect(xml).toContain("<image:title>Fresh &lt;Avocados&gt;</image:title>");
    expect(xml).toContain("<image:caption>Local &amp; freshly harvested</image:caption>");
    expect(xml).not.toContain("hreflang");
    expect(xml).not.toContain("/login");
    expect(xml).not.toContain("/checkout");
  });

  it("excludes product images hosted outside the canonical site", async () => {
    mocks.getProducts.mockResolvedValue([{
      id: "product-2",
      name: "Outside image",
      description: "",
      image: "https://images.example.org/product.jpg"
    }]);

    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain("<loc>https://www.princesbrothers.com/products/product-2</loc>");
    expect(xml).not.toContain("images.example.org");
  });

  it("uses the configured canonical origin", async () => {
    vi.stubEnv("APP_URL", "https://shop.example.com");

    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain("<loc>https://shop.example.com/</loc>");
    expect(xml).not.toContain("princesbrothers.com");
  });
});
