import type { PropsWithChildren } from "react";
import Link from "next/link";

export default function ContributorLayout({ children }: PropsWithChildren) {
  return <><header className="partner-header"><Link className="partner-brand" href="/store"><span>P<span>&</span>B</span> Princess & Brothers</Link><Link className="partner-shop-link" href="/store">Back to shop <span aria-hidden="true">↗</span></Link></header>{children}</>;
}