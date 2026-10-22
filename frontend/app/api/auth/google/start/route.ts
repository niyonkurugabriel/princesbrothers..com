import { NextResponse } from "next/server";
import { createGoogleState, googleAuthorizationUrl } from "@/features/auth/providers";

export async function GET() {
  try {
    const state = await createGoogleState();
    return NextResponse.redirect(googleAuthorizationUrl(state));
  } catch {
    return NextResponse.json({ error: "Google sign-in is currently unavailable." }, { status: 503 });
  }
}
