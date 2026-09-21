import { ProductListing } from "../../../components/storefront/product-listing";
import { categories, getProducts } from "../../../lib/storefront/data";

export default async function ProductsPage() {
  const products = await getProducts();
  return <main className="catalog-page content-width"><div className="catalog-header"><div className="section-kicker">The collection</div><h1>Good things, <em>found.</em></h1><p>Pieces with a story, made to become part of yours.</p></div><ProductListing products={products} categories={categories} /></main>;
}