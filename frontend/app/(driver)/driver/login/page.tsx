import Link from "next/link";
import { DriverLoginForm } from "@/features/driver/components/login-form";

export default function DriverLoginPage() {
  return <main className="driver-login-page"><div className="driver-login-card"><div className="driver-logo"><span>P<span>&</span>B</span> Driver</div><p className="driver-eyebrow">Princess & Brothers logistics</p><h1>Ready for<br /><em>the road?</em></h1><p className="driver-muted">Sign in to see today&apos;s active routes and keep every delivery moving.</p><DriverLoginForm /><Link className="driver-help-link" href="mailto:dispatch@princesbrothers.com">Need help? Contact dispatch</Link></div></main>;
}