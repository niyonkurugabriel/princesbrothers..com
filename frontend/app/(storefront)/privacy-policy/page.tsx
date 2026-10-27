import type { Metadata } from "next";
import PrivacyPolicyContent from "./privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: {
    canonical: "/privacy-policy"
  }
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
