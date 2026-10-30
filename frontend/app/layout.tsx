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
  return <html lang="en" className={cn("font-sans", geist.variable)}><body><ThemeSession />{children}<Script id="google-analytics-init" strategy="beforeInteractive">{`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-7G0X3N8489');`}</Script><Script src="https://www.googletagmanager.com/gtag/js?id=G-7G0X3N8489" strategy="afterInteractive" /><Script src="/assets/js/bootstrap.bundle.min.js" strategy="afterInteractive" /><Script src="/assets/js/organic-3d.js" strategy="afterInteractive" /></body></html>;
}