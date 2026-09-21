"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitContributorApplication } from "../../app/(contributor)/actions";

export function ContributorApplicationForm() {
  const [state, setState] = useState<{ error?: string; success?: boolean; companyName?: string }>({});
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setState(await submitContributorApplication({}, formData)));
  }

  if (state.success) {
    return <div className="application-success"><div className="success-mark">✓</div><p className="eyebrow">Application received</p><h2>We&apos;ll be in touch, {state.companyName}.</h2><p>Our team will review your details and email you once your contributor account is ready.</p><Link className="button button-navy" href="/store">Return to the shop <span aria-hidden="true">→</span></Link></div>;
  }

  return <form className="application-form" onSubmit={submit}>
    <div className="form-intro"><div className="section-kicker">Tell us about you</div><h2>Start a good <em>conversation.</em></h2><p>We review every application personally. Tell us what you make and where you are based.</p></div>
    <label>Company name<input name="companyName" required placeholder="Your company or studio" /></label>
    <label>Registration number<input name="registrationNumber" required placeholder="Business registration number" /></label>
    <label>Work email<input name="email" required type="email" placeholder="hello@yourcompany.com" /></label>
    <label>Location<input name="location" required placeholder="City, country" /></label>
    <label>Business details<textarea name="businessDetails" required rows={5} placeholder="What do you make? What should we know about your work?" /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button button-navy" disabled={isPending} type="submit">{isPending ? "Sending your application…" : "Submit application"}<span aria-hidden="true">→</span></button>
  </form>;
}