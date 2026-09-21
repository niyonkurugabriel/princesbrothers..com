"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, ProductCard } from "./storefront";
import type { StorefrontCategory, StorefrontProduct } from "../../lib/storefront/data";

export function ProductListing({ products, categories }: { products: StorefrontProduct[]; categories: StorefrontCategory[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("all");

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || product.categorySlug === category;
    const matchesPrice = maxPrice === "all" || product.price <= Number(maxPrice);
    return matchesQuery && matchesCategory && matchesPrice;
  }), [category, maxPrice, products, query]);

  return (
    <>
      <div className="catalog-toolbar">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search products" /></label>
        <div className="filter-row">
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All pieces</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>Price</span><select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}><option value="all">Any price</option><option value="40">Under $40</option><option value="75">Under $75</option><option value="100">Under $100</option></select></label>
        </div>
      </div>
      <div className="catalog-meta"><span>{filteredProducts.length} {filteredProducts.length === 1 ? "piece" : "pieces"}</span><Link className="text-link" href="/store">Back to home <span aria-hidden="true">↗</span></Link></div>
      {filteredProducts.length ? <div className="product-grid product-grid-large">{filteredProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <EmptyState title="Nothing quite matched" copy="Try a broader search or another category. The good stuff may be hiding nearby." action={<button className="button button-navy" type="button" onClick={() => { setQuery(""); setCategory("all"); setMaxPrice("all"); }}>Clear filters</button>} />}
    </>
  );
}