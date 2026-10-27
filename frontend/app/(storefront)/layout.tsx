import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { CartProvider, SiteFooter, SiteHeader } from "@/features/storefront/components/storefront";
import { CookieConsentBanner } from "@/features/privacy/components/cookie-consent-banner";

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true
  }
};

export default function StorefrontLayout({ children }: PropsWithChildren) {
  return <CartProvider><div className="storefront-shell"><SiteHeader />{children}<SiteFooter /></div><CookieConsentBanner /></CartProvider>;
}