"use server";

import { db } from "@princess-brothers/db";

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
  const location = String(formData.get("location") ?? "").trim();
  const businessDetails = String(formData.get("businessDetails") ?? "").trim();

  if (!companyName || !registrationNumber || !email || !location || !businessDetails) {
    return { error: "Please complete every field before submitting your application." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid business email address." };

  try {
    await db.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          firstName: companyName,
          lastName: "Contributor",
          status: "INVITED"
        }
      });

      await transaction.contributor.create({
        data: {
          userId: user.id,
          companyName,
          registrationNumber,
          businessEmail: email,
          location,
          businessDetails,
          status: "PENDING"
        }
      });
    });
    return { success: true, companyName };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "That email or registration number is already under review." };
    }
    return { error: "We could not submit your application. Please try again." };
  }
}