import type { Metadata } from "next";
import Script from "next/script";
import "bootstrap/dist/css/bootstrap.min.css";
import "../public/assets/css/organic-3d.css";
import "./globals.css";
import { ThemeSession } from "@/features/storefront/components/theme-session";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Princess & Brothers",
  description: "Princess & Brothers e-commerce platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={cn("font-sans", geist.variable)}><body><ThemeSession />{children}<Script src="/assets/js/bootstrap.bundle.min.js" strategy="afterInteractive" /><Script src="/assets/js/organic-3d.js" strategy="afterInteractive" /></body></html>;
}