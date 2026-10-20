export const PRIVACY_POLICY_VERSION = "v1.0";
export const PRIVACY_POLICY_UPDATED_AT = "11 October 2026";

export const privacyPolicySections = [
  {
    id: "controller",
    title: "1. Data controller identification",
    paragraphs: [
      "Princess & Brothers Limited (\"Princess & Brothers\", \"we\", \"us\") is the data controller for personal data processed through princesbrothers.com and its connected portals.",
      "Contact our Data Protection Officer at dpo@princesbrothers.com or write to Princess & Brothers Limited, Kigali, Rwanda. Include a safe way for us to contact you and do not send passwords or payment-card security codes."
    ]
  },
  {
    id: "collection",
    title: "2. What we collect across our portals",
    paragraphs: [
      "Storefront customers: account name, email, phone, delivery and billing details, order history, support messages, and payment status or gateway references. Full payment-card details are handled by the payment provider, not stored by this site.",
      "Contributors: contact and business details, application and verification materials, product and consignment records, communications, and payout-account details needed to operate the contributor relationship.",
      "Drivers: identity and contact details, assigned deliveries, delivery status, proof-of-delivery records, and location information only where a delivery feature requires it.",
      "Administrators: account identifiers, role and access records, security events, and actions taken in operational systems.",
      "All portals may generate technical data such as IP address, device and browser information, session and security logs, and coarse country information inferred from an IP address. We do not use precise device GPS for storefront currency localization."
    ]
  },
  {
    id: "purposes",
    title: "3. Purposes and lawful bases",
    paragraphs: [
      "We use account, contact, order, delivery, and contributor data to provide requested services and perform contracts; process payments and fulfil orders; maintain accounts; prevent fraud and protect platform security; respond to support and data-rights requests; and meet accounting, tax, regulatory, and other legal obligations.",
      "Where permitted, we rely on legitimate interests for proportionate security, service reliability, fraud prevention, and operational improvement, after considering individuals' rights and expectations. We rely on consent where the law requires it, including optional analytics or other non-essential technologies. You can withdraw consent at any time without affecting prior lawful processing.",
      "We do not make solely automated decisions with legal or similarly significant effects based on the AI or telemetry described in this policy. If that changes, we will provide required notices and safeguards before the change."
    ]
  },
  {
    id: "processors",
    title: "4. Processors, payments and disclosures",
    paragraphs: [
      "We use service providers to host and secure the platform, deliver email or SMS, support customer communications, process payments, and provide analytics if enabled. Depending on your chosen payment method and region, a gateway may include MTN Mobile Money, Airtel Money, M-Pesa, Paystack, Flutterwave, Stripe, PayPal, or another provider shown at checkout.",
      "Payment providers receive the information needed to authorize and settle a payment and process it under their own terms and privacy notices. We receive transaction status and relevant references. We do not promise that every listed provider is enabled in every region.",
      "We may disclose information to professional advisers, regulators, law enforcement, or a successor organisation where legally permitted or required. We do not sell personal data."
    ]
  },
  {
    id: "location",
    title: "5. Currency localization and location data",
    paragraphs: [
      "A request's IP address may be used to infer a country or region and select a localized currency display or payment options. This is approximate location data, not GPS tracking. You can change the currency using the controls provided by the site where available.",
      "Currency conversion may use cached exchange-rate information. Displayed conversions are estimates until the final order total is confirmed at checkout. IP-derived country information may be processed by our hosting or security provider to deliver the service."
    ]
  },
  {
    id: "ai",
    title: "6. AI telemetry and automated processing",
    paragraphs: [
      "Where AI-assisted search, chat, product suggestions, contributor price guidance, or document review features are enabled, we process the prompt, relevant product or listing information, and technical logs needed to return and troubleshoot the feature. Do not submit sensitive personal information unless the feature specifically requests it.",
      "AI output may be incomplete or inaccurate and should be reviewed by a person before relying on it for business, safety, or financial decisions. AI support is not a substitute for human review, and automated audit signals do not by themselves determine eligibility, employment, or access to essential services.",
      "We aim to minimize telemetry and limit access to it. Third-party AI providers, if used, receive only the information required for the feature under the applicable service arrangement."
    ]
  },
  {
    id: "rights",
    title: "7. Your data protection rights",
    paragraphs: [
      "Subject to the conditions and exceptions in applicable law, you may request access to your personal data, correction of inaccurate data, deletion or restriction where available, information about processing, and withdrawal of consent. You may also raise an objection or complaint with Rwanda's competent Data Protection Office.",
      "Use the “Exercise Your Data Rights” form below or email dpo@princesbrothers.com. We may ask for a verification code or other proportionate evidence to protect your account. We will respond within the period required by applicable law; complex or legally restricted requests may require further information or may be declined with an explanation where the law permits.",
      "Deletion is not absolute. We may retain information needed to complete a transaction, resolve a dispute, prevent fraud, comply with statutory record-keeping duties, or establish or defend legal claims. We will restrict or delete it when those reasons no longer apply."
    ]
  },
  {
    id: "retention",
    title: "8. Retention and financial records",
    paragraphs: [
      "Account and profile information is kept while the account is active and reviewed for deletion or minimization after closure, except for records we must keep or need to resolve a dispute. Unfinished verification codes expire after 10 minutes; session, security, and operational logs are retained only for the documented security or service purpose.",
      "Order, payment, invoice, and tax records are kept for the statutory financial and tax archiving period applicable to the record, then securely deleted or anonymized. The applicable period depends on record type and legal requirements; our finance and legal teams must set and periodically review the retention schedule before production use.",
      "Rights-request and consent audit records are retained only as long as needed to evidence and administer the request or consent, meet legal obligations, and handle disputes. Access is restricted and retention periods are reviewed."
    ]
  },
  {
    id: "security",
    title: "9. Security and incident notifications",
    paragraphs: [
      "We use access controls, role separation, encrypted transport, secure session handling, and operational safeguards appropriate to the information and risks. No internet transmission or storage system can be guaranteed completely secure.",
      "If a personal-data incident occurs, we will investigate, contain and document it, and notify the competent authority and affected people when and as required by applicable law. Contact dpo@princesbrothers.com to report a suspected privacy or security issue."
    ]
  },
  {
    id: "cross-border",
    title: "International transfers",
    paragraphs: [
      "Some infrastructure and service providers may process information outside Rwanda. Where personal data is transferred across borders, Princess & Brothers will use the transfer mechanism and safeguards required by Rwanda's data protection law and, where applicable, GDPR, and will assess the destination and provider protections."
    ]
  },
  {
    id: "changes",
    title: "Policy changes",
    paragraphs: [
      `This policy is version ${PRIVACY_POLICY_VERSION}, last updated ${PRIVACY_POLICY_UPDATED_AT}. We may update it to reflect changes in our services or legal requirements. Material changes will be posted here with a revised date.`
    ]
  }
] as const;

export function consentTypeForPreferences(preferences: { analytics: boolean; geolocation: boolean }): "ALL" | "NECESSARY_ONLY" | "CUSTOM" {
  if (preferences.analytics && preferences.geolocation) return "ALL";
  if (!preferences.analytics && !preferences.geolocation) return "NECESSARY_ONLY";
  return "CUSTOM";
}
