import { NextResponse } from "next/server";
import { createGoogleState, googleAuthorizationUrl } from "@/features/auth/providers";

export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get("returnTo") ?? "/account";
    const returnTo = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/login") ? requested : "/account";
    const state = await createGoogleState(returnTo);
    return NextResponse.redirect(googleAuthorizationUrl(state));
  } catch {
    return NextResponse.json({ error: "Google sign-in is currently unavailable." }, { status: 503 });
  }
}
