import { createHash, randomInt, randomUUID } from "node:crypto";
import { execute, query } from "@princess-brothers/db";
import { defaultTtlFor } from "@/features/auth/config";
import { createSession } from "@/features/auth/session";
import type { AuthPortal, AuthMethod } from "@/features/auth/types";
import type { RowDataPacket } from "mysql2/promise";

const providerError = (name: string): Error => new Error(`${name} is not configured. Add its credentials to the environment.`);
function googleRedirectUri(): string {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri) throw providerError("Google OAuth");
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new Error("GOOGLE_REDIRECT_URI must be an absolute URL ending in /api/auth/google/callback.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.pathname !== "/api/auth/google/callback" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) throw new Error("GOOGLE_REDIRECT_URI must be an absolute URL ending in /api/auth/google/callback.");
  return redirectUri;
}
type OtpPurpose = "password-reset" | "driver-password-reset";
const otpKey = (phone: string, purpose: OtpPurpose): string => `pb:otp:${purpose}:${createHash("sha256").update(phone).digest("hex")}`;
const oauthKey = (state: string): string => `pb:oauth:google:${state}`;
type ChallengeRow = RowDataPacket & { id: string; value: string; attempts: number; expiresAt: Date };

async function storeChallenge(id: string, value: string, ttlSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await execute("DELETE FROM AuthChallenge WHERE expiresAt <= ?", [new Date()]);
  await execute(
    "INSERT INTO AuthChallenge (id, value, expiresAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), attempts = 0, expiresAt = VALUES(expiresAt)",
    [id, value, expiresAt]
  );
}

async function findActiveChallenge(id: string) {
  const rows = await query<ChallengeRow>("SELECT id, value, attempts, expiresAt FROM AuthChallenge WHERE id = ? LIMIT 1", [id]);
  const challenge = rows[0];
  if (challenge && challenge.expiresAt.getTime() <= Date.now()) {
    await execute("DELETE FROM AuthChallenge WHERE id = ? AND expiresAt <= ?", [id, new Date()]);
    return null;
  }
  return challenge;
}

export type ProviderSessionInput = {
  userId: string;
  portal: AuthPortal;
  authMethod: AuthMethod;
  roles?: string[];
  permissions?: string[];
  emailVerified?: boolean;
  contributorApproved?: boolean;
};

export async function issueProviderSession(input: ProviderSessionInput) {
  const ttlSeconds = defaultTtlFor(input.portal, input.authMethod);
  return createSession({ id: input.userId, ttlSeconds, roles: input.roles ?? [], permissions: input.permissions ?? [], ...input });
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER;
  const from = process.env.EMAIL_FROM;
  if (!provider || !from) throw providerError("Email provider");
  if (provider === "sendgrid") {
    if (!process.env.SENDGRID_API_KEY) throw providerError("SendGrid");
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", { method: "POST", headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: "text/plain", value: text }] }) });
    if (!response.ok) throw new Error(`SendGrid request failed with ${response.status}`);
    return;
  }
  if (provider === "postmark") {
    if (!process.env.POSTMARK_SERVER_TOKEN) throw providerError("Postmark");
    const response = await fetch("https://api.postmarkapp.com/email", { method: "POST", headers: { "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ From: from, To: to, Subject: subject, TextBody: text }) });
    if (!response.ok) throw new Error(`Postmark request failed with ${response.status}`);
    return;
  }
  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) throw providerError("Resend");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text })
    });
    if (!response.ok) throw new Error(`Resend request failed with ${response.status}`);
    return;
  }
  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (process.env.SMS_PROVIDER === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) throw providerError("Twilio");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body })
    });
    if (!response.ok) throw new Error(`Twilio request failed with ${response.status}`);
    return;
  }
  if (!process.env.AFRICASTALKING_USERNAME || !process.env.AFRICASTALKING_API_KEY) throw providerError("Africa's Talking");
  const response = await fetch("https://api.africastalking.com/version1/messaging", { method: "POST", headers: { apiKey: process.env.AFRICASTALKING_API_KEY, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ username: process.env.AFRICASTALKING_USERNAME, to, message: body, ...(process.env.AFRICASTALKING_FROM ? { from: process.env.AFRICASTALKING_FROM } : {}) }) });
  if (!response.ok) throw new Error(`Africa's Talking request failed with ${response.status}`);
}

export async function requestPhoneOtp(phone: string, purpose: OtpPurpose): Promise<void> {
  const normalized = phone.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error("Use an international phone number, for example +250...");
  const code = randomInt(100000, 1000000).toString();
  await storeChallenge(otpKey(normalized, purpose), JSON.stringify({ code }), 600);
  await sendSms(normalized, `Your Princess & Brothers ${purpose.replaceAll("-", " ")} code is ${code}. It expires in 10 minutes.`);
}

export async function verifyPhoneOtp(phone: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  const key = otpKey(phone.trim(), purpose);
  const challenge = await findActiveChallenge(key);
  if (!challenge || challenge.attempts >= 5) return false;

  let value: { code: string };
  try {
    value = JSON.parse(challenge.value) as { code: string };
  } catch {
    return false;
  }

  const expiresAt = { gt: new Date() };
  if (value.code !== code) {
    await execute("UPDATE AuthChallenge SET attempts = attempts + 1 WHERE id = ? AND attempts = ? AND expiresAt > ?", [key, challenge.attempts, new Date()]);
    return false;
  }

  const consumed = await execute("DELETE FROM AuthChallenge WHERE id = ? AND attempts = ? AND expiresAt > ?", [key, challenge.attempts, new Date()]);
  return consumed.affectedRows === 1;
}

export async function createGoogleState(returnTo = "/account"): Promise<string> {
  googleRedirectUri();
  const state = randomUUID();
  await storeChallenge(oauthKey(state), returnTo, 600);
  return state;
}

export function googleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", redirect_uri: googleRedirectUri(), response_type: "code", scope: "openid email profile", state, access_type: "online", prompt: "select_account" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function consumeGoogleState(state: string): Promise<string | null> {
  const id = oauthKey(state);
  const challenge = await findActiveChallenge(id);
  if (!challenge) return null;
  const consumed = await execute("DELETE FROM AuthChallenge WHERE id = ? AND value = ? AND expiresAt > ?", [id, challenge.value, new Date()]);
  return consumed.affectedRows === 1 ? challenge.value : null;
}

export async function exchangeGoogleCode(code: string): Promise<{ id: string; email: string; firstName: string; lastName: string; emailVerified: boolean }> {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", redirect_uri: googleRedirectUri(), grant_type: "authorization_code" }) });
  if (!response.ok) throw new Error("Google authorization failed.");
  const tokens = await response.json() as { access_token?: string };
  if (!tokens.access_token) throw new Error("Google did not return an access token.");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) throw new Error("Google profile lookup failed.");
  const profile = await profileResponse.json() as { sub?: string; email?: string; given_name?: string; family_name?: string; email_verified?: boolean };
  if (!profile.sub || !profile.email) throw new Error("Google profile is missing required identity fields.");
  return { id: profile.sub, email: profile.email.toLowerCase(), firstName: profile.given_name ?? "Google", lastName: profile.family_name ?? "User", emailVerified: profile.email_verified === true };
}

export async function findOrCreateGoogleUser(profile: Awaited<ReturnType<typeof exchangeGoogleCode>>): Promise<string> {
  const existing = await query<RowDataPacket & { id: string; status: string; emailVerifiedAt: Date | null }>("SELECT id, status, emailVerifiedAt FROM `User` WHERE email = ? LIMIT 1", [profile.email]);
  if (existing[0]) {
    if (existing[0].status !== "ACTIVE") throw new Error("This account is not active. Contact support for help.");
    if (profile.emailVerified && !existing[0].emailVerifiedAt) await execute("UPDATE `User` SET emailVerifiedAt = ?, updatedAt = ? WHERE id = ?", [new Date(), new Date(), existing[0].id]);
    return existing[0].id;
  }
  const id = randomUUID();
  await execute("INSERT INTO `User` (id, email, firstName, lastName, status, emailVerifiedAt, updatedAt) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)", [id, profile.email, profile.firstName, profile.lastName, profile.emailVerified ? new Date() : null, new Date()]);
  return id;
}
