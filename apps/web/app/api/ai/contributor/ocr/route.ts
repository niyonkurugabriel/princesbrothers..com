import { NextResponse } from "next/server";
import { verifyOnboardingDocument } from "../../../../../lib/ai/contributor/ocrVerification";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("document");
  const documentType = form.get("documentType");
  if (!(file instanceof File) || !["registration", "tax", "identity"].includes(String(documentType))) return NextResponse.json({ error: "A supported document and document type are required." }, { status: 400 });
  return NextResponse.json(await verifyOnboardingDocument({ documentType: documentType as "registration" | "tax" | "identity", fileName: file.name, fileBytes: new Uint8Array(await file.arrayBuffer()) }));
}