import Link from "next/link";
import { ContributorApplicationForm } from "@/features/contributor/components/application-form";
import { ContributorLoginForm } from "@/features/contributor/components/contributor-login-form";

export default function ContributorApplicationPage() {
  return <main className="partner-application">
    <section className="partner-application-intro">
      <div className="partner-intro-copy">
        <p className="eyebrow light">Princess &amp; Brothers · Growing partner community</p>
        <h1>Bring your harvest<br /><em>to our table.</em></h1>
      </div>
      <p className="partner-intro-description">We partner with independent farms and contributors who care for healthy soil and harvest organic food with care.</p>
      <div className="partner-values">
        <span><b>01</b> Care for the soil</span>
        <span><b>02</b> A growing local market</span>
        <span><b>03</b> A fair way to grow</span>
      </div>
    </section>
    <section className="partner-form-panel" aria-label="Contributor account and application">
      <ContributorLoginForm />
      <ContributorApplicationForm />
    </section>
  </main>;
}