import type { Metadata } from "next";
import Script from "next/script";
import "bootstrap/dist/css/bootstrap.min.css";
import "../public/assets/css/organic-3d.css";
import "./globals.css";
import { ThemeSession } from "@/features/storefront/components/theme-session";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Princess & Brothers",
  description: "Princess & Brothers e-commerce platform",
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TQ8TNKFT"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <ThemeSession />
        {children}
        <Script id="google-tags-init" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-7G0X3N8489');
window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7G0X3N8489"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-TQ8TNKFT"
          strategy="beforeInteractive"
        />
        <Script
          src="/assets/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="/assets/js/organic-3d.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}