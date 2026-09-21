import type { PropsWithChildren } from "react";
import { CartProvider, SiteFooter, SiteHeader } from "../../components/storefront/storefront";

export default function StorefrontLayout({ children }: PropsWithChildren) {
  return <CartProvider><SiteHeader />{children}<SiteFooter /></CartProvider>;
}