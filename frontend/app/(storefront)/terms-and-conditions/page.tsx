import Link from "next/link";

const termsSections = [
  {
    title: "1. Introduction and acceptance of terms",
    paragraphs: [
      "Welcome to princesbrothers.com, operated by Princess & Brothers Limited (the “Company”, “we”, “our” or “us”), a business based in Kigali, Rwanda.",
      "By accessing, browsing, registering for, or using any part of this website—including the B2C Storefront, B2B Contributor Portal, Driver Logistics Portal, or Admin Command Center—you (“User”, “Customer”, “Contributor” or “Driver”) agree to these Terms and Conditions. If you do not agree, discontinue use of the platform."
    ]
  },
  {
    title: "2. Multi-portal scope and eligibility",
    paragraphs: [
      "The platform is an integrated ecosystem with role-based access. The Storefront is for product discovery, checkout, and order tracking. The Contributor Portal is for commercial supply partners; an application begins an intake review and access may remain inactive until Company review, verification, and approval. The Driver Portal is restricted to authorized delivery personnel. The Admin Command Center is restricted to authorized internal personnel and protected by access controls, which may include multi-factor authentication and network restrictions.",
      "Users must be at least 18 years of age, or otherwise have legal capacity under applicable Rwandan law, to register or complete transactions. By using the platform, you represent that you meet this requirement."
    ]
  },
  {
    title: "3. Pricing, currency localization, and payment processing",
    paragraphs: [
      "Product prices are maintained in a base currency and may be displayed in regional or international currencies, including RWF, KSh, UGX, USD, and EUR. Localized display may use approximate country information inferred from an IP address and cached exchange rates. The final amount and currency are shown at checkout before you confirm an order.",
      "Online payments are handled through the payment methods and gateways displayed at checkout, which may include MTN Mobile Money, Airtel Money, M-Pesa, cards, Stripe, PayPal, or other providers. Each provider's own terms and privacy notice may apply. Cash on delivery is available only where offered and is reconciled through authorized delivery processes."
    ]
  },
  {
    title: "4. Orders, fulfilment, and consignment",
    paragraphs: [
      "Contributors may supply goods to Princess & Brothers on a consignment basis under a separate contributor arrangement. Contributors do not operate independent storefronts unless we expressly agree otherwise in writing.",
      "We may refuse, cancel, or limit an order where permitted by law, including for typographical or pricing errors, payment issues, suspected fraud, or stock discrepancies. If payment has already been collected for a cancelled order, we will arrange an appropriate refund.",
      "As between the Company and Customer, responsibility for loss or damage transfers upon delivery confirmation recorded through the platform, subject to any non-excludable rights under applicable law."
    ]
  },
  {
    title: "5. Intellectual property",
    paragraphs: [
      "The platform's software, designs, graphics, logos, trademarks, text, and workflows are owned by Princess & Brothers Limited or its licensors and are protected by applicable law. You may use the platform for its intended personal or business purpose. You must not reproduce, scrape, reverse-engineer, or commercially exploit platform materials without written permission, except to the extent applicable law allows."
    ]
  },
  {
    title: "6. Disclaimers and limitation of liability",
    paragraphs: [
      "We use reasonable care to keep the platform available and information accurate, but online services may be interrupted and product, availability, or currency information can change. Nothing in these terms excludes a warranty, right, or liability that cannot lawfully be excluded.",
      "To the maximum extent permitted by Rwandan law, we are not liable for indirect, incidental, special, consequential, or punitive loss arising from use of or inability to use the platform. To the extent a cap is permitted by law, our aggregate liability for a direct claim relating to a specific order or service will not exceed the amount paid to us for that order or service. This clause does not limit liability that applicable law makes non-excludable."
    ]
  },
  {
    title: "7. Governing law and dispute resolution",
    paragraphs: [
      "These Terms and Conditions are governed by the laws of the Republic of Rwanda. The parties will first attempt in good faith to resolve disputes through discussion. If a dispute cannot be resolved amicably, it may be brought before a competent court in Kigali, subject to mandatory jurisdiction and consumer-protection rules."
    ]
  },
  {
    title: "8. Changes to these terms",
    paragraphs: [
      "We may update these Terms and Conditions and will post the revised version here with an updated revision date. Where required by law, we will provide notice or obtain consent. Continued use after an update takes effect constitutes acceptance only to the extent permitted by applicable law."
    ]
  }
];

export const metadata = {
  title: "Terms and Conditions",
  alternates: {
    canonical: "/terms-and-conditions"
  }
};

export default function TermsAndConditionsPage() {
  return <main className="mx-auto max-w-5xl px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
    <header className="rounded-3xl bg-gradient-to-br from-emerald-950 to-emerald-800 px-6 py-10 text-white sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-200">Princess &amp; Brothers Limited</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Terms and Conditions</h1>
      <p className="mt-4 text-sm text-emerald-100">Effective 11 October 2026 · Republic of Rwanda</p>
    </header>
    <div className="mt-8 grid gap-5">
      {termsSections.map((section) => <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" key={section.title}>
        <h2 className="text-xl font-bold text-emerald-950 sm:text-2xl">{section.title}</h2>
        {section.paragraphs.map((paragraph) => <p className="mt-4 leading-7 text-slate-700" key={paragraph}>{paragraph}</p>)}
      </section>)}
    </div>
    <p className="mt-8 text-sm"><Link className="font-semibold text-emerald-900 underline" href="/privacy-policy">Read our Privacy Policy</Link></p>
  </main>;
}
