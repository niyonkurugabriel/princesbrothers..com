import { getProducts } from "@/features/storefront/server/data";

const SITE_URL = "https://princesbrothers.com";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

function imageUrl(path: string): string | null {
  try {
    const url = new URL(path, SITE_URL);
    return url.origin === SITE_URL ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageEntry(path: string, title: string, caption: string): string {
  const url = imageUrl(path);
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
}): string {
  const url = absoluteUrl(path);
  const imageXml = (options.images ?? []).filter(Boolean).join("\n");
  return [
    "  <url>",
    `    <loc>${escapeXml(url)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en-rw" href="${escapeXml(url)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}" />`,
    `    <changefreq>${options.changeFrequency}</changefreq>`,
    `    <priority>${options.priority}</priority>`,
    ...(imageXml ? [imageXml] : []),
    "  </url>"
  ].join("\n");
}

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  const catalogImages = products.map((product) =>
    imageEntry(product.image, product.name, product.description || `Fresh ${product.name} from Princess & Brothers in Rwanda.`)
  );

  const entries = [
    urlEntry("/", {
      changeFrequency: "daily",
      priority: "1.0",
      images: [imageEntry("/logo.png", "Princess & Brothers Ltd", "Fresh produce and organic agricultural delivery in Rwanda.")]
    }),
    urlEntry("/products", {
      changeFrequency: "daily",
      priority: "0.8",
      images: catalogImages
    }),
    urlEntry("/privacy-policy", { changeFrequency: "yearly", priority: "0.3" }),
    urlEntry("/terms-and-conditions", { changeFrequency: "yearly", priority: "0.3" }),
    ...products.map((product) =>
      urlEntry(`/products/${encodeURIComponent(product.id)}`, {
        changeFrequency: "weekly",
        priority: "0.6",
        images: [imageEntry(
          product.image,
          product.name,
          product.description || `Fresh ${product.name} from Princess & Brothers in Rwanda.`
        )]
      })
    )
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
    '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
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
