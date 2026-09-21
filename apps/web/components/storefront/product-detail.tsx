"use client";

import { useState } from "react";
import type { StorefrontProduct } from "../../lib/storefront/data";
import { useCart } from "./storefront";

export function AddToCartButton({ product }: { product: StorefrontProduct }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  return <button className="button button-navy add-button" type="button" onClick={() => { addItem(product); setAdded(true); }}>{added ? "Added to bag ✓" : "Add to bag"}<span aria-hidden="true">→</span></button>;
}