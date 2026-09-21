import type { AiProvider, AiResultMeta } from "../provider";
import { stubMeta } from "../provider";

export type OcrVerificationInput = { documentType: "registration" | "tax" | "identity"; fileName: string; fileBytes?: Uint8Array; expectedCompanyName?: string; expectedRegistrationNumber?: string };
export type OcrVerificationOutput = { verified: boolean; extracted: { companyName?: string; registrationNumber?: string; documentNumber?: string }; issues: string[]; meta: AiResultMeta };

/** Provider contract for OCR, document extraction, and onboarding verification. */
export type OcrVerificationProvider = AiProvider<OcrVerificationInput, OcrVerificationOutput>;

export class StubOcrVerificationProvider implements OcrVerificationProvider {
  readonly name = "stub";
  readonly model = "document-check-v1";

  async run(input: OcrVerificationInput): Promise<OcrVerificationOutput> {
    const supported = /\.(pdf|png|jpe?g|webp)$/i.test(input.fileName);
    const issues = supported ? [] : ["Unsupported document format."];
    return { verified: supported, extracted: {}, issues, meta: stubMeta(supported ? 0.3 : 0.9) };
  }
}

export async function verifyOnboardingDocument(input: OcrVerificationInput, provider: OcrVerificationProvider = new StubOcrVerificationProvider()): Promise<OcrVerificationOutput> {
  return provider.run(input);
}