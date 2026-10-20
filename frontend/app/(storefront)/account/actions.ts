"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { withTransaction } from "@princess-brothers/db";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";

export type AccountDetailsState = {
  error?: string;
  success?: boolean;
};

export async function updateAccountDetails(
  _previousState: AccountDetailsState,
  formData: FormData,
): Promise<AccountDetailsState> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { error: "Sign in before updating your account details." };

  const claims = await verifyActiveSession(token);
  if (!claims || claims.portal !== "storefront" || claims.sub.startsWith("guest:")) {
    return { error: "Your account session has expired. Please sign in again." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const profileImageUrl = String(formData.get("profileImageUrl") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").trim().toUpperCase();

  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter your first name, last name, and a valid email address." };
  }
  const safeProfileImage = !profileImageUrl || profileImageUrl.startsWith("/") && !profileImageUrl.startsWith("//") || (() => {
    try { return new URL(profileImageUrl).protocol === "https:"; } catch { return false; }
  })();
  if (!safeProfileImage || (profileImageUrl?.length ?? 0) > 191) return { error: "Use a secure HTTPS or local profile image URL up to 191 characters." };
  if (password && password.length < 8) return { error: "Your new password must be at least 8 characters." };
  const hasAddress = line1 || city || state || postalCode || countryCode;
  if (hasAddress && (!line1 || !city || !postalCode || countryCode.length !== 2)) {
    return { error: "Complete the delivery address or leave every address field blank." };
  }

  try {
    await withTransaction(async (transaction) => {
      const passwordHash = password ? await bcrypt.hash(password, 12) : null;
      const userUpdateSql = "UPDATE `User` SET email = ?, firstName = ?, lastName = ?, phone = ?, profileImageUrl = ?, " + (passwordHash ? "passwordHash = ?, " : "") + "updatedAt = ? WHERE id = ?";
      const userUpdateParameters = passwordHash ? [email, firstName, lastName, phone, profileImageUrl, passwordHash, new Date(), claims.sub] : [email, firstName, lastName, phone, profileImageUrl, new Date(), claims.sub];
      await transaction.execute(userUpdateSql, userUpdateParameters);

      if (hasAddress) {
        const now = new Date();
        await transaction.execute("INSERT INTO Customer (id, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE updatedAt = VALUES(updatedAt)", [randomUUID(), claims.sub, now, now]);
        const [customerRows] = await transaction.execute("SELECT id FROM Customer WHERE userId = ? LIMIT 1", [claims.sub]);
        const customer = (customerRows as { id: string }[])[0];
        const [addressRows] = await transaction.execute("SELECT id FROM Address WHERE customerId = ? AND isDefault = 1 LIMIT 1", [customer.id]);
        const address = (addressRows as { id: string }[])[0];
        const addressFields = ["BOTH", `${firstName} ${lastName}`, line1, city, state || null, postalCode, countryCode, phone];
        if (address) {
          await transaction.execute("UPDATE Address SET type = ?, recipient = ?, line1 = ?, city = ?, state = ?, postalCode = ?, countryCode = ?, phone = ?, updatedAt = ? WHERE id = ?", [...addressFields, now, address.id]);
        } else {
          await transaction.execute("INSERT INTO Address (id, customerId, type, recipient, line1, city, state, postalCode, countryCode, phone, isDefault, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [randomUUID(), customer.id, ...addressFields, now, now]);
        }
      } else {
        const [customerRows] = await transaction.execute("SELECT id FROM Customer WHERE userId = ? LIMIT 1", [claims.sub]);
        const customer = (customerRows as { id: string }[])[0];
        if (customer) await transaction.execute("DELETE FROM Address WHERE customerId = ? AND isDefault = 1", [customer.id]);
      }
    });
    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") return { error: "That email address is already in use." };
    return { error: "We could not update your account. Please try again." };
  }
}