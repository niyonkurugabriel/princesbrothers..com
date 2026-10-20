"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, ProductCard } from "@/features/storefront/components/storefront";
import type { StorefrontCategory, StorefrontProduct } from "@/features/storefront/server/data";

export function ProductListing({ products, categories, purchasedCategoryIds, searchedTerms, initialCategoryId }: { products: StorefrontProduct[]; categories: StorefrontCategory[]; purchasedCategoryIds: string[]; searchedTerms: string[]; initialCategoryId?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategoryId ?? "all");
  const [maxPrice, setMaxPrice] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [searchHistory, setSearchHistory] = useState(searchedTerms);

  function trackSearch(value: string) {
    setQuery(value);
    const normalized = value.trim().toLowerCase();
    if (normalized.length < 2 || typeof document === "undefined") return;
    try {
      const existing: unknown = JSON.parse(decodeURIComponent(document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("pb_product_searches="))?.split("=").slice(1).join("=") ?? "%5B%5D"));
      const terms = Array.isArray(existing) ? existing.filter((term): term is string => typeof term === "string") : [];
      const nextTerms = [normalized, ...terms.filter((term) => term !== normalized)].slice(0, 8);
      setSearchHistory(nextTerms);
      document.cookie = `pb_product_searches=${encodeURIComponent(JSON.stringify(nextTerms))}; Max-Age=2592000; Path=/; SameSite=Lax`;
    } catch {
      setSearchHistory([normalized]);
      document.cookie = `pb_product_searches=${encodeURIComponent(JSON.stringify([normalized]))}; Max-Age=2592000; Path=/; SameSite=Lax`;
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || product.categoryId === category;
    const matchesPrice = maxPrice === "all" || product.price <= Number(maxPrice);
    return matchesQuery && matchesCategory && matchesPrice;
  }).sort((first, second) => {
    if (sort === "price-low") return first.price - second.price;
    if (sort === "price-high") return second.price - first.price;
    if (sort === "newest") return second.createdAt - first.createdAt;
    if (sort === "name") return first.name.localeCompare(second.name);
    const score = (product: StorefrontProduct) => (product.categoryId && purchasedCategoryIds.includes(product.categoryId) ? 5 : 0) + searchHistory.reduce((total, term) => total + (`${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term) ? 2 : 0), 0) + Math.max(0, 2 - (Date.now() - product.createdAt) / (1000 * 60 * 60 * 24 * 30));
    return score(second) - score(first) || second.createdAt - first.createdAt;
  });

  return (
    <>
      <div className="catalog-toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => trackSearch(event.target.value)} placeholder="Search produce" aria-label="Search produce" /></label>
        <div className="filter-row">
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All produce</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>Price</span><select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}><option value="all">Any price</option><option value="54000">Under FRw 54,000</option><option value="100000">Under FRw 100,000</option><option value="135000">Under FRw 135,000</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="newest">Recently added</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
        </div>
      </div>
      <div className="catalog-meta"><span>{filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}</span><Link className="text-link" href="/">Back to home <span aria-hidden="true">↗</span></Link></div>
      {filteredProducts.length ? <div className="product-grid product-grid-large row g-4">{filteredProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <EmptyState title="No produce found" copy="Try another search or category to find something fresh for your table." action={<button className="button button-navy btn-3d btn-3d-green" type="button" onClick={() => { setQuery(""); setCategory("all"); setMaxPrice("all"); }}>Clear filters</button>} />}
    </>
  );
}