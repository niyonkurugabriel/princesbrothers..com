"use client";

import Link from "next/link";
import { useState } from "react";
import { RightsRequestModal } from "@/features/privacy/components/rights-request-modal";
import { PRIVACY_POLICY_UPDATED_AT, PRIVACY_POLICY_VERSION, privacyPolicySections } from "@/features/privacy/policy";

export default function PrivacyPolicyPage() {
  const [rightsModalOpen, setRightsModalOpen] = useState(false);

  return <main className="mx-auto max-w-7xl px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
    <header className="rounded-3xl bg-gradient-to-br from-emerald-950 to-emerald-800 px-6 py-10 text-white sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-200">Princess &amp; Brothers Limited</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
      <p className="mt-4 max-w-3xl leading-7 text-emerald-50">How we collect, use, share, protect, and retain personal data across our customer, contributor, driver, and administration portals.</p>
      <p className="mt-4 text-sm text-emerald-100">Version {PRIVACY_POLICY_VERSION} · Updated {PRIVACY_POLICY_UPDATED_AT} · Rwanda</p>
    </header>

    <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Privacy policy sections" className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
        <h2 className="font-semibold">On this page</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {privacyPolicySections.map((section) => <li key={section.id}><a className="text-emerald-900 underline-offset-4 hover:underline" href={`#${section.id}`}>{section.title}</a></li>)}
        </ul>
      </nav>

      <div className="min-w-0">
        <aside className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          This policy describes our intended processing practices. Retention periods, provider contracts, cross-border safeguards, and operational controls must be verified against the services actually enabled and reviewed by qualified Rwandan privacy counsel before relying on this page as a compliance certification.
        </aside>
        <div className="grid gap-5">
          {privacyPolicySections.map((section) => <section className="scroll-mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" id={section.id} key={section.id}>
            <h2 className="text-xl font-bold text-emerald-950 sm:text-2xl">{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p className="mt-4 leading-7 text-slate-700" key={paragraph}>{paragraph}</p>)}
            {section.id === "rights" && <button className="mt-5 rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white transition hover:bg-emerald-900" onClick={() => setRightsModalOpen(true)} type="button">Exercise Your Data Rights</button>}
          </section>)}
        </div>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link className="font-semibold text-emerald-900 underline" href="/terms-and-conditions">Terms and Conditions</Link>
          <Link className="font-semibold text-emerald-900 underline" href="/">Return to the storefront</Link>
        </div>
      </div>
    </div>
    {rightsModalOpen && <RightsRequestModal onClose={() => setRightsModalOpen(false)} />}
  </main>;
}
