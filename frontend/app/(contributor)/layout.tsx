import type { PropsWithChildren } from "react";
import Link from "next/link";

export default function ContributorLayout({ children }: PropsWithChildren) {
  return <><header className="partner-header"><Link className="partner-brand" href="/"><span>P<span>&</span>B</span> Princess & Brothers</Link><div className="partner-header-links"><Link href="/privacy-policy">Privacy</Link><Link href="/terms-and-conditions">Terms</Link><Link className="partner-shop-link" href="/">Back to shop <span aria-hidden="true">↗</span></Link></div></header>{children}</>;
}