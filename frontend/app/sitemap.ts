import type { MetadataRoute } from "next";
import { getProducts } from "@/features/storefront/server/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.APP_URL ?? "https://princesbrothers.com").replace(/\/+$/, "");
  const fixedRoutes = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/products", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/privacy-policy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/terms-and-conditions", changeFrequency: "yearly" as const, priority: 0.3 },
  ];
  const products = await getProducts();

  return [
    ...fixedRoutes.map(({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}${path}`,
      changeFrequency,
      priority,
    })),
    ...products.map((product) => ({
      url: `${baseUrl}/products/${encodeURIComponent(product.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
