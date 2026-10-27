import { getProducts } from "@/features/storefront/server/data";
import { getSiteUrl } from "@/lib/site-url";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(path: string, siteUrl: URL): string {
  return new URL(path, siteUrl).toString();
}

function imageUrl(path: string, siteUrl: URL): string | null {
  try {
    const url = new URL(path, siteUrl);
    return url.origin === siteUrl.origin ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageEntry(path: string, title: string, caption: string, siteUrl: URL): string {
  const url = imageUrl(path, siteUrl);
  if (!url) return "";
  return [
    "    <image:image>",
    `      <image:loc>${escapeXml(url)}</image:loc>`,
    `      <image:title>${escapeXml(title)}</image:title>`,
    `      <image:caption>${escapeXml(caption)}</image:caption>`,
    "    </image:image>"
  ].join("\n");
}

function urlEntry(path: string, options: {
  changeFrequency: "daily" | "weekly" | "yearly";
  priority: string;
  images?: string[];
}, siteUrl: URL): string {
  const url = absoluteUrl(path, siteUrl);
  const imageXml = (options.images ?? []).filter(Boolean).join("\n");
  return [
    "  <url>",
    `    <loc>${escapeXml(url)}</loc>`,
    `    <changefreq>${options.changeFrequency}</changefreq>`,
    `    <priority>${options.priority}</priority>`,
    ...(imageXml ? [imageXml] : []),
    "  </url>"
  ].join("\n");
}

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = getSiteUrl();
  const products = await getProducts();
  const catalogImages = products.map((product) =>
    imageEntry(product.image, product.name, product.description || `Fresh ${product.name} from Princess & Brothers in Rwanda.`, siteUrl)
  );

  const entries = [
    urlEntry("/", {
      changeFrequency: "daily",
      priority: "1.0",
      images: [imageEntry("/logo.png", "Princess & Brothers Ltd", "Fresh produce and organic agricultural delivery in Rwanda.", siteUrl)]
    }, siteUrl),
    urlEntry("/products", {
      changeFrequency: "daily",
      priority: "0.8",
      images: catalogImages
    }, siteUrl),
    urlEntry("/privacy-policy", { changeFrequency: "yearly", priority: "0.3" }, siteUrl),
    urlEntry("/terms-and-conditions", { changeFrequency: "yearly", priority: "0.3" }, siteUrl),
    ...products.map((product) =>
      urlEntry(`/products/${encodeURIComponent(product.id)}`, {
        changeFrequency: "weekly",
        priority: "0.6",
        images: [imageEntry(
          product.image,
          product.name,
          product.description || `Fresh ${product.name} from Princess & Brothers in Rwanda.`,
          siteUrl
        )]
      }, siteUrl)
    )
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries,
    "</urlset>"
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
