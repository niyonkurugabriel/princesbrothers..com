import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { withTransaction } from "@princess-brothers/db";
import { sendEmail, sendSms } from "@/features/auth/providers";
import { consumePasswordResetRateLimit } from "@/features/auth/password-reset";
import type { RowDataPacket } from "mysql2/promise";

type Role = "CUSTOMER" | "CONTRIBUTOR" | "DRIVER" | "GUEST";
type RequestType = "ACCESS" | "RECTIFICATION" | "ERASURE" | "CONSENT_WITHDRAWAL";
type Contact = { type: "email"; value: string } | { type: "phone"; value: string };
type ChallengeRow = RowDataPacket & { value: string; attempts: number; expiresAt: Date };

function normalizeContact(contact: string): Contact | null {
  const value = contact.trim();
  if (/^\S+@\S+\.\S+$/.test(value) && value.length <= 255) return { type: "email", value: value.toLowerCase() };
  if (/^\+[1-9]\d{7,14}$/.test(value)) return { type: "phone", value };
  return null;
}

function challengeId(contact: string): string {
  return `pb:privacy:rights:${createHash("sha256").update(contact).digest("hex")}`;
}

function hashCode(id: string, code: string): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters.");
  return createHmac("sha256", secret).update(`${id}:${code}`).digest("hex");
}

function clientIp(request: Request): string {
  const candidate = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many data-rights requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {
      fullName?: unknown;
      contact?: unknown;
      role?: unknown;
      requestType?: unknown;
      verificationCode?: unknown;
      reason?: unknown;
    } | null;
    if (
      !body
      || typeof body.fullName !== "string"
      || typeof body.contact !== "string"
      || typeof body.role !== "string"
      || typeof body.requestType !== "string"
      || typeof body.verificationCode !== "string"
      || (body.reason !== undefined && typeof body.reason !== "string")
    ) {
      return NextResponse.json({ error: "Complete the required data-rights request fields." }, { status: 400 });
    }

    const fullName = body.fullName.trim();
    const contact = normalizeContact(body.contact);
    const requestType = body.requestType as RequestType;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const role = body.role as Role;
    const validRoles: Role[] = ["CUSTOMER", "CONTRIBUTOR", "DRIVER", "GUEST"];
    const validRequestTypes: RequestType[] = ["ACCESS", "RECTIFICATION", "ERASURE", "CONSENT_WITHDRAWAL"];
    if (fullName.length < 2 || fullName.length > 255 || !contact || !validRoles.includes(role) || !validRequestTypes.includes(requestType)) {
      return NextResponse.json({ error: "Enter a valid name, contact, role, and request type." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(body.verificationCode) || reason.length > 3000) {
      return NextResponse.json({ error: "Enter a valid six-digit verification code and keep request details under 3,000 characters." }, { status: 400 });
    }

    const retryAfter = await consumePasswordResetRateLimit([
      { name: "privacy-rights-ip", value: clientIp(request) },
      { name: "privacy-rights-contact", value: contact.value }
    ]);
    if (retryAfter !== null) return rateLimited(retryAfter);

    const id = challengeId(contact.value);
    const codeHash = hashCode(id, body.verificationCode);
    const reference = await withTransaction(async (transaction) => {
      const [rows] = await transaction.execute(
        "SELECT value, attempts, expiresAt FROM AuthChallenge WHERE id = ? AND expiresAt > UTC_TIMESTAMP(3) FOR UPDATE",
        [id]
      );
      const challenge = Array.isArray(rows) ? rows[0] as ChallengeRow | undefined : undefined;
      if (!challenge || challenge.attempts >= 5) return null;

      let expectedHash: string;
      try {
        const parsed = JSON.parse(challenge.value) as { codeHash?: unknown };
        if (typeof parsed.codeHash !== "string" || !/^[a-f0-9]{64}$/.test(parsed.codeHash)) throw new Error("Invalid challenge");
        expectedHash = parsed.codeHash;
      } catch {
        await transaction.execute("DELETE FROM AuthChallenge WHERE id = ?", [id]);
        return null;
      }

      const supplied = Buffer.from(codeHash, "hex");
      const expected = Buffer.from(expectedHash, "hex");
      if (!timingSafeEqual(supplied, expected)) {
        await transaction.execute("UPDATE AuthChallenge SET attempts = attempts + 1 WHERE id = ?", [id]);
        return null;
      }

      await transaction.execute("DELETE FROM AuthChallenge WHERE id = ?", [id]);
      const [insertResult] = await transaction.execute(
        "INSERT INTO data_rights_requests (full_name, contact_email, contact_phone, portal_role, request_type, request_details) VALUES (?, ?, ?, ?, ?, ?)",
        [
          fullName,
          contact.type === "email" ? contact.value : null,
          contact.type === "phone" ? contact.value : null,
          role,
          requestType,
          reason || null
        ]
      );
      return "insertId" in insertResult ? Number(insertResult.insertId) : null;
    });
    if (reference === null) return NextResponse.json({ error: "The verification code is invalid or expired. Request a new code." }, { status: 401 });

    const requestSummary = `Reference: ${reference}\nName: ${fullName}\nContact: ${contact.value}\nPortal: ${role}\nRequest type: ${requestType}\nDetails: ${reason || "Not provided"}`;
    try {
      await sendEmail("dpo@princesbrothers.com", `Data-rights request ${reference}: ${requestType}`, requestSummary);
      if (contact.type === "email") {
        await sendEmail(contact.value, "We received your data-rights request", `Hello ${fullName},\n\nWe have received your ${requestType.toLowerCase().replaceAll("_", " ")} request. Reference: ${reference}. Our Data Protection team will review it and respond within the period required by applicable law.\n\nPrincess & Brothers Limited`);
      } else {
        await sendSms(contact.value, `Princess & Brothers received your data-rights request. Reference: ${reference}. Our Data Protection team will review it.`);
      }
    } catch (notificationError) {
      console.error(`Data-rights request ${reference} was recorded, but notification delivery failed.`, notificationError);
      return NextResponse.json(
        { error: `Your request was recorded (reference ${reference}), but a confirmation could not be delivered. Contact dpo@princesbrothers.com with this reference.` },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, reference, message: "Your request has been securely submitted. We will respond within the period required by applicable law." }, { status: 201 });
  } catch (error) {
    console.error("Data-rights request could not be processed.", error);
    return NextResponse.json({ error: "Your data-rights request could not be processed. Please try again later." }, { status: 503 });
  }
}
