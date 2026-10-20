import { NextResponse } from "next/server";
import { PRIVACY_POLICY_UPDATED_AT, PRIVACY_POLICY_VERSION, privacyPolicySections } from "@/features/privacy/policy";

export async function GET() {
  return NextResponse.json(
    {
      version: PRIVACY_POLICY_VERSION,
      updatedAt: PRIVACY_POLICY_UPDATED_AT,
      controller: "Princess & Brothers Limited",
      policy: privacyPolicySections
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
  );
}
