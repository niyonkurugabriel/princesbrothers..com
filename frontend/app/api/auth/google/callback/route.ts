import { NextResponse } from "next/server";
import { authCookie } from "@/features/auth/cookies";
import { consumeGoogleState, exchangeGoogleCode, findOrCreateGoogleUser, issueProviderSession } from "@/features/auth/providers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!state || !code) return NextResponse.json({ error: "Google authorization was cancelled." }, { status: 400 });
    const storedReturnTo = await consumeGoogleState(state);
    if (!storedReturnTo) return NextResponse.json({ error: "Google authorization state expired." }, { status: 400 });
    const returnTo = storedReturnTo.startsWith("/") && !storedReturnTo.startsWith("//") && !storedReturnTo.startsWith("/login") ? storedReturnTo : "/account";
    const profile = await exchangeGoogleCode(code);
    const userId = await findOrCreateGoogleUser(profile);
    const session = await issueProviderSession({ userId, portal: "storefront", authMethod: "google-oauth", emailVerified: profile.emailVerified });
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set(authCookie(session.token, 60 * 60 * 24 * 30));
    return response;
  } catch {
    return NextResponse.json({ error: "Google sign-in could not be completed." }, { status: 503 });
  }
}
