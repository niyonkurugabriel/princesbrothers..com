import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { ProductListing } from "@/features/storefront/components/product-listing";
import { getProducts, getPurchasedCategoryIds, getStorefrontCategories } from "@/features/storefront/server/data";

export const metadata = {
  title: "Fresh produce",
  description: "Browse seasonal fruit, vegetables and everyday staples from Princess & Brothers contributors in Rwanda.",
  alternates: {
    canonical: "/products"
  }
};

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const [products, categories, params, claims] = await Promise.all([
    getProducts(),
    getStorefrontCategories(),
    searchParams ?? Promise.resolve<{ category?: string }>({}),
    token ? verifyActiveSession(token) : Promise.resolve(null)
  ]);
  const purchasedCategoryIds = claims?.portal === "storefront" && !claims.sub.startsWith("guest:") ? await getPurchasedCategoryIds(claims.sub) : [];
  let searchedTerms: string[] = [];
  try {
    const raw = cookieStore.get("pb_product_searches")?.value;
    const parsed: unknown = raw ? JSON.parse(decodeURIComponent(raw)) : [];
    if (Array.isArray(parsed)) searchedTerms = parsed.filter((term): term is string => typeof term === "string").slice(0, 8);
  } catch {
    searchedTerms = [];
  }
  return <main className="catalog-page content-width"><div className="catalog-header"><div className="section-kicker">The weekly harvest</div><h1>Fresh from the <em>farm.</em></h1><p>Seasonal organic produce from contributors who care for the land and the food they bring to your table.</p></div><ProductListing products={products} categories={categories} purchasedCategoryIds={purchasedCategoryIds} searchedTerms={searchedTerms} initialCategoryId={params.category} /></main>;
}