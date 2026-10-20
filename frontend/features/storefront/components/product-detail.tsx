"use client";

import { useState } from "react";
import type { StorefrontProduct } from "@/features/storefront/server/data";
import { useCart } from "@/features/storefront/components/storefront";

export function AddToCartButton({ product }: { product: StorefrontProduct }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  return <button className="button button-navy btn-3d btn-3d-green add-button" type="button" onClick={() => { addItem(product); setAdded(true); }}>{added ? "Added to basket ✓" : "Add to basket"}<span aria-hidden="true">→</span></button>;
}