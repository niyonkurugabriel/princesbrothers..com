"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { StorefrontProduct } from "../../lib/storefront/data";

type CartLine = { product: StorefrontProduct; quantity: number };
type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (product: StorefrontProduct) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartLine[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("pb-cart");
    if (saved) setItems(JSON.parse(saved) as CartLine[]);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pb-cart", JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.product.price * item.quantity, 0),
    addItem: (product) => setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { product, quantity: 1 }];
    }),
    updateQuantity: (productId, quantity) => setItems((current) => {
      if (quantity <= 0) return current.filter((item) => item.product.id !== productId);
      return current.map((item) => item.product.id === productId ? { ...item, quantity } : item);
    }),
    removeItem: (productId) => setItems((current) => current.filter((item) => item.product.id !== productId)),
    clearCart: () => setItems([])
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header className="site-header">
      <div className="announcement">Free delivery on orders over $75 <span>•</span> Curated with care</div>
      <div className="nav-wrap">
        <Link className="brand" href="/store" aria-label="Princess and Brothers home">
          <span className="brand-mark">P<span>&</span>B</span>
          <span className="brand-name">Princess & Brothers</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link className={isActive("/store/products") ? "active" : ""} href="/store/products">Shop</Link>
          <Link href="/store#story">Our story</Link>
          <Link href="/store#contributors">Contributors</Link>
        </nav>
        <div className="nav-actions">
          <Link className="contributor-link" href="/partner">Become a contributor <span aria-hidden="true">↗</span></Link>
          <Link className="account-link" href="/store/orders/PB-10482">Account</Link>
          <Link className="cart-link" href="/store/cart" aria-label={`Cart with ${itemCount} items`}>
            Bag <span className="cart-count">{itemCount}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <div className="footer-brand">Princess & Brothers</div>
        <p>A considered collection for everyday life.</p>
      </div>
      <div className="footer-links">
        <Link href="/store/products">Shop all</Link>
        <Link href="/store/orders/PB-10482">Track an order</Link>
        <Link href="/partner">Become a contributor</Link>
      </div>
      <p className="footer-note">© 2026 Princess & Brothers</p>
    </footer>
  );
}

export function ProductCard({ product, priority = false }: { product: StorefrontProduct; priority?: boolean }) {
  const { addItem } = useCart();
  return (
    <article className="product-card">
      <Link href={`/store/products/${product.slug}`} className="product-image-wrap">
        <div className="product-image" style={{ backgroundImage: `url(${product.image})` }} role="img" aria-label={product.name} />
        {priority && <span className="product-tag">Editor&apos;s pick</span>}
      </Link>
      <div className="product-card-body">
        <div>
          <p className="eyebrow">{product.category}</p>
          <Link href={`/store/products/${product.slug}`} className="product-name">{product.name}</Link>
        </div>
        <div className="product-card-bottom">
          <span className="price">${product.price.toFixed(2)}</span>
          <button className="quick-add" type="button" onClick={() => addItem(product)}>Add <span aria-hidden="true">+</span></button>
        </div>
      </div>
    </article>
  );
}

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  return <span className="rating" aria-label={`${rating} out of 5 stars`}><span aria-hidden="true">★★★★★</span> <b>{rating.toFixed(1)}</b>{count !== undefined && <small>({count})</small>}</span>;
}

export function LoadingState({ label = "Loading the collection" }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" aria-hidden="true" /><p>{label}</p></div>;
}

export function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">✦</div><h2>{title}</h2><p>{copy}</p>{action}</div>;
}