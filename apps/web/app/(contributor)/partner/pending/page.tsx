import Link from "next/link";

export default function ContributorPendingPage() {
  return <main className="partner-status-page"><div className="status-orbit" aria-hidden="true">✦</div><p className="eyebrow">Contributor application</p><h1>Good things<br /><em>take a little time.</em></h1><p>Thanks for applying. Our team is reviewing your company details and will email you when your contributor account is approved.</p><div className="pending-steps"><span className="done"><b>✓</b> Application received</span><span className="current"><b>02</b> Team review</span><span><b>03</b> Your portal opens</span></div><Link className="button button-navy" href="/store">Browse the shop <span aria-hidden="true">↗</span></Link></main>;
}