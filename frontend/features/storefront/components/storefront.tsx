"use client";

import Link from "next/link";
import Image from "next/image";
import { ContributorIcon, DriverIcon } from "@/features/storefront/components/portal-icons";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { formatDefaultAmount } from "@/features/payments/payment-context";
import type { ApprovedContributor, StorefrontProduct } from "@/features/storefront/server/data";
import { ThemeToggle } from "@/features/storefront/components/theme-toggle";
import { ChevronDown, Home, ShoppingBasket, Sprout, Store, UserRound } from "lucide-react";

type CartLine = { product: StorefrontProduct; quantity: number };
type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  signedIn: boolean;
  portal: string;
  addItem: (_product: StorefrontProduct) => void;
  updateQuantity: (_productId: string, _quantity: number) => void;
  removeItem: (_productId: string) => void;
  clearCart: () => void;
  signOut: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [portal, setPortal] = useState("");

  useEffect(() => {
    window.localStorage.removeItem("pb-cart");
    const saved = window.localStorage.getItem("pb-cart-v2");
    if (saved) setItems(JSON.parse(saved) as CartLine[]);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session: { authenticated?: boolean; portal?: string }) => {
        if (!active) return;
        setSignedIn(Boolean(session.authenticated));
        setPortal(session.portal ?? "");
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pb-cart-v2", JSON.stringify(items));
  }, [items]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setSignedIn(false);
    setPortal("");
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.product.price * item.quantity, 0),
    signedIn,
    portal,
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
    clearCart: () => setItems([]),
    signOut
  }), [items, signedIn, portal, signOut]);

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
    <header className="site-header organic-navbar-3d organic-water navbar navbar-expand-lg fixed-top">
      <div className="container-fluid organic-flex organic-flex-between nav-wrap">
        <Link className="brand" href="/" aria-label="Princess and Brothers home">
          <Image className="brand-logo" src="/logo.png" alt="Princess and Brothers" width={58} height={58} priority />
          <span className="brand-name">Princess & Brothers</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#pb-main-nav" aria-controls="pb-main-nav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="pb-main-nav">
          <nav className="main-nav navbar-nav" aria-label="Main navigation">
            <Link className={`nav-link organic-nav-link-3d ${pathname === "/" ? "active" : ""}`} href="/"><Home aria-hidden="true" className="nav-icon" size={16} />Home</Link>
            <Link className={`nav-link organic-nav-link-3d ${isActive("/products") ? "active" : ""}`} href="/products"><Store aria-hidden="true" className="nav-icon" size={16} />Shop</Link>
            <Link className="nav-link organic-nav-link-3d" href="/#story"><Sprout aria-hidden="true" className="nav-icon" size={16} />Our approach</Link>
          </nav>
          <div className="nav-actions">
            <AccountMenu currentPath={pathname} />
            <ThemeToggle />
            <Link className="cart-link organic-nav-link-3d" href="/cart" aria-label={`Cart with ${itemCount} items`}>
              <ShoppingBasket aria-hidden="true" size={17} /> Basket <span className="cart-count">{itemCount}</span>
            </Link>
          </div>
        </div>
              <div className="portal-shortcuts">
          <Link aria-label="Become a contributor" className="portal-shortcut contributor-link" href="/partner" title="Become a contributor"><ContributorIcon /><span className="portal-shortcut-label">Contributor</span></Link>
          <Link aria-label="Become a driver" className="portal-shortcut driver-link" href="/driver/login" title="Become a driver"><DriverIcon /><span className="portal-shortcut-label">Driver</span></Link>
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
        <p>Taste RWANDA&apos;s finest.</p>
      </div>
      <div className="footer-links">
        <Link href="/products">Go to shop</Link>
        <Link href="/orders">Order history</Link>
        <Link className="footer-portal-link" href="/partner"><ContributorIcon />Become a contributor</Link>
        <Link className="footer-portal-link" href="/driver/login"><DriverIcon />Become a driver</Link>
        <Link href="/login">Sign in or create account</Link>
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms-and-conditions">Terms and Conditions</Link>
      </div>
      <div className="footer-socials" aria-label="Contact Princess and Brothers">
        <a href="https://wa.me/250791702041" target="_blank" rel="noreferrer">WhatsApp</a>
        <a href="https://instagram.com/princesbrothersltd" target="_blank" rel="noreferrer">Instagram</a>
        <a href="https://www.tiktok.com/@princesbrothersltd" target="_blank" rel="noreferrer">TikTok</a>
        <a href="tel:+250791702041">+250 791 702 041</a>
        <a href="mailto:Reselyne@princesbrothers.com">Reselyne@princesbrothers.com</a>
      </div>
      <RateUs />
      <p className="footer-note" >© 2026 Princess & Brothers</p>
    </footer>
  );
}

export function ProductCard({ product, priority = false }: { product: StorefrontProduct; priority?: boolean }) {
  const { addItem } = useCart();
  return (
    <article className="product-card organic-card-3d col-12 col-sm-6 col-lg-4">
      <Link href={`/products/${product.id}`} className="product-image-wrap">
        <div className="product-image organic-card-3d__img" style={{ backgroundImage: `url(${product.image})` }} role="img" aria-label={product.name} />
        <span className="organic-ribbon">Organic</span>
        {priority && <span className="price-tag-3d">Fresh</span>}
      </Link>
      <div className="product-card-body">
        <div>
          <p className="eyebrow">{product.category}</p>
          <Link href={`/products/${product.id}`} className="product-name">{product.name}</Link>
        </div>
        <div className="product-card-bottom">
          <span className="price">{formatDefaultAmount(product.price)}</span>
          <button className="quick-add btn-3d btn-3d-green" type="button" onClick={() => addItem(product)}>Add to cart <span aria-hidden="true">+</span></button>
        </div>
      </div>
    </article>
  );
}

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  return <span className="rating" aria-label={`${rating} out of 5 stars`}><span aria-hidden="true">★★★★★</span> <b>{rating.toFixed(1)}</b>{count !== undefined && <small>({count})</small>}</span>;
}

export function LoadingState({ label = "Loading this week's harvest" }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" aria-hidden="true" /><p>{label}</p></div>;
}

export function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">✦</div><h2>{title}</h2><p>{copy}</p>{action}</div>;
}

function AccountMenu({ currentPath = "/account" }: { currentPath?: string }) {
  const [open, setOpen] = useState(false);
  const { signedIn, portal, signOut: logOut } = useCart();
  const returnTo = currentPath && currentPath !== "/login" ? currentPath : "/account";

  async function signOut() {
    await logOut();
    setOpen(false);
  }

  return <div className="account-menu">
    <button className="account-link organic-nav-link-3d" type="button" aria-expanded={open} aria-controls="account-dropdown" onClick={() => setOpen((current) => !current)}><UserRound aria-hidden="true" size={16} /> {signedIn ? "Account options" : "Log in / Sign up"} <ChevronDown aria-hidden="true" className="account-chevron" size={14} /></button>
    {open && <div className="account-dropdown organic-glass organic-water" id="account-dropdown">
      <p className="account-eyebrow">{signedIn ? `Signed in · ${portal}` : "Your Princess & Brothers account"}</p>
      {signedIn ? <>
        <Link href="/orders">Order history</Link>
        <button type="button" onClick={signOut}>Sign out</button>
      </> : <>
        <a className="google-auth-button" href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}><span aria-hidden="true">G</span> Continue with Google</a>
        <Link href="/login"><UserRound aria-hidden="true" size={16} /> Log in</Link>
        <Link href="/login?mode=signup"><Sprout aria-hidden="true" size={16} /> Sign up</Link>
      </>}
    </div>}
  </div>;
}

function RateUs() {
  const { signedIn, portal } = useCart();
  const [rating, setRating] = useState(0);

  if (!signedIn || portal !== "storefront") return null;
  const feedback = encodeURIComponent(`I rate Princess & Brothers ${rating} out of 5 stars.`);
  return <div className="footer-rating"><span>Rate us</span><div aria-label="Choose a rating from one to five stars">{[1, 2, 3, 4, 5].map((value) => <button className={value <= rating ? "selected" : ""} key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)}>★</button>)}</div>{rating > 0 && <a href={`https://wa.me/250791702041?text=${feedback}`} target="_blank" rel="noreferrer">Send rating</a>}</div>;
}

export function ContributorShowcase({ contributors }: { contributors: ApprovedContributor[] }) {
  return <div className="contributor-copy">
    <div className="contributor-invite">
      <p className="eyebrow">For our contributors</p>
      <h2>Good food comes<br /><em>from good people.</em></h2>
      <p>Our contributors bring seasonal produce from farms that care for healthy soil and thoughtful harvests.</p>
    </div>
    <div className="approved-contributors-panel organic-glass organic-water" aria-label="Contributors">
      <p className="eyebrow light">Our contributors</p>
      <h2>Good food starts <em>with good soil.</em></h2>
      {contributors.length > 0 ? <ul>{contributors.map((contributor) => <li key={contributor.id}><div><strong>{contributor.companyName}</strong><span>{contributor.location}</span></div><p>{contributor.businessDetails}</p></li>)}</ul> : <p className="approved-contributors-empty">Our contributor community is growing. Check back soon for updates.</p>}
    </div>
  </div>;
}