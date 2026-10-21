"use server";

import { query, withTransaction } from "@princess-brothers/db";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import type { RowDataPacket } from "mysql2/promise";

export type ContributorApplicationState = {
  error?: string;
  success?: boolean;
  companyName?: string;
};

export async function submitContributorApplication(
  _previousState: ContributorApplicationState,
  formData: FormData,
): Promise<ContributorApplicationState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const registrationNumber = String(formData.get("registrationNumber") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const businessDetails = String(formData.get("businessDetails") ?? "").trim();

  if (!companyName || !registrationNumber || !email || !phone || !password || !confirmPassword || !location || !businessDetails) {
    return { error: "Please complete every field before submitting your application." };
  }
  if (password !== confirmPassword) return { error: "The passwords do not match." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid business email address." };
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return { error: "Use an international phone number, for example +250..." };
  if (password.length < 8 || password.length > 72) return { error: "Choose a password between 8 and 72 characters." };

  try {
    await withTransaction(async (transaction) => {
      const userId = randomUUID();
      const now = new Date();
      await transaction.execute("INSERT INTO `User` (id, email, passwordHash, firstName, lastName, phone, status, updatedAt) VALUES (?, ?, ?, ?, 'Contributor', ?, 'INVITED', ?)", [userId, email, await bcrypt.hash(password, 12), companyName, phone, now]);
      await transaction.execute("INSERT INTO Contributor (id, userId, companyName, registrationNumber, businessEmail, location, businessDetails, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)", [randomUUID(), userId, companyName, registrationNumber, email, location, businessDetails, now, now]);
    });
    return { success: true, companyName };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      return { error: "That email or registration number is already under review." };
    }
    return { error: "We could not submit your application. Please try again." };
  }
}

async function approvedContributorId(): Promise<{ userId: string; contributorId: string } | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "contributor" || !claims.contributorApproved) return null;
  const rows = await query<RowDataPacket & { id: string }>("SELECT id FROM Contributor WHERE userId = ? AND status = 'APPROVED' LIMIT 1", [claims.sub]);
  return rows[0] ? { userId: claims.sub, contributorId: rows[0].id } : null;
}

export async function sendContributorMessage(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const sender = await approvedContributorId();
  if (!sender) return { ok: false, error: "An approved contributor session is required." };
  const body = String(formData.get("body") ?? "").trim();
  const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
  const attachmentName = String(formData.get("attachmentName") ?? "").trim().slice(0, 255);
  const messageType = formData.get("messageType") === "REPORT" ? "REPORT" : "MESSAGE";
  if (!body && !attachmentUrl) return { ok: false, error: "Write a message or attach a file/link." };
  if (body.length > 4000 || (attachmentUrl && (!attachmentUrl.startsWith("/api/contributor/chat-attachment/") && !/^https:\/\//i.test(attachmentUrl)))) {
    return { ok: false, error: "Check the message length and attachment link." };
  }

  const messageId = randomUUID();
  try {
    await withTransaction(async (transaction) => {
      await transaction.execute("INSERT INTO PartnerAdminMessage (id, contributorId, senderAdminId, senderUserId, messageType, body, attachmentUrl, attachmentName, createdAt) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)", [messageId, sender.contributorId, sender.userId, messageType, body, attachmentUrl || null, attachmentName || null, new Date()]);
      await transaction.execute("INSERT INTO AuditLog (id, actorId, action, entityType, entityId, metadata) VALUES (?, ?, ?, ?, ?, ?)", [randomUUID(), sender.userId, messageType === "REPORT" ? "Submitted contributor report" : "Sent contributor message", "PartnerAdminMessage", messageId, JSON.stringify({ attachment: Boolean(attachmentUrl) })]);
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "The message could not be sent. Please try again." };
  }
}