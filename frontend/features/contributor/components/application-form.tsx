"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitContributorApplication } from "@/app/(contributor)/actions";

export function ContributorApplicationForm() {
  const [state, setState] = useState<{ error?: string; success?: boolean; companyName?: string }>({});
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setState(await submitContributorApplication({}, formData)));
  }

  if (state.success) {
    return <div className="application-success"><div className="success-mark">✓</div><p className="eyebrow">Application received</p><h2>We&apos;ll be in touch, {state.companyName}.</h2><p>Our team will review your details and email you once your contributor account is ready.</p><Link className="button button-navy" href="/">Return to the shop <span aria-hidden="true">→</span></Link></div>;
  }

  return <form className="application-form" onSubmit={submit}>
    <div className="form-intro"><div className="section-kicker">Tell us about your farm</div><h2>Grow good things <em>with us.</em></h2><p>We review every contributor application personally. Tell us what you grow and how you care for the land.</p></div>
    <label>Farm or business name<input name="companyName" required placeholder="Your farm or growing business" /></label>
    <label>Registration number<input name="registrationNumber" required placeholder="Farm or business registration" /></label>
    <label>Business email<input name="email" required type="email" placeholder="hello@yourfarm.com" /></label>
    <label>Phone number<input name="phone" required type="tel" placeholder="+2507…" /></label>
    <label>Account password<input name="password" required type="password" minLength={8} autoComplete="new-password" /></label>
    <label>Growing location<input name="location" required placeholder="District, region, country" /></label>
    <label>What you grow<textarea name="businessDetails" required rows={5} placeholder="Crops, growing practices, seasonality, and anything shoppers should know." /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button button-navy" disabled={isPending} type="submit">{isPending ? "Sending your application…" : "Submit application"}<span aria-hidden="true">→</span></button>
  </form>;
}