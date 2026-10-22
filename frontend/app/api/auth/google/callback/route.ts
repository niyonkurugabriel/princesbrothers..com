import { NextResponse } from "next/server";
import { authCookie } from "@/features/auth/cookies";
import { consumeGoogleState, exchangeGoogleCode, findOrCreateGoogleUser, issueProviderSession } from "@/features/auth/providers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!state || !code) return NextResponse.json({ error: "Google authorization was cancelled." }, { status: 400 });
    const validState = await consumeGoogleState(state);
    if (!validState) return NextResponse.json({ error: "Google authorization state expired." }, { status: 400 });
    const profile = await exchangeGoogleCode(code);
    const userId = await findOrCreateGoogleUser(profile);
    const session = await issueProviderSession({ userId, portal: "storefront", authMethod: "google-oauth", emailVerified: profile.emailVerified });
    const homeUrl = new URL("/", process.env.APP_URL || request.url);
    if (!["http:", "https:"].includes(homeUrl.protocol) || homeUrl.username || homeUrl.password) {
      throw new Error("APP_URL must be an absolute HTTP(S) URL.");
    }
    const response = NextResponse.redirect(homeUrl);
    response.cookies.set(authCookie(session.token, 60 * 60 * 24 * 30));
    return response;
  } catch (error) {
    console.error("Google sign-in callback failed.", error);
    return NextResponse.json({ error: "Google sign-in could not be completed." }, { status: 503 });
  }
}
