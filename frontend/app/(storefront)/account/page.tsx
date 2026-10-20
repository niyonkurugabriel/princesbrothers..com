import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@princess-brothers/db";
import type { RowDataPacket } from "mysql2/promise";
import { AccountForm } from "@/features/storefront/components/account-form";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";

export default async function AccountPage() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "storefront" || claims.sub.startsWith("guest:")) {
    redirect("/login?returnTo=%2Faccount");
  }

  const [users, addresses] = await Promise.all([
    query<RowDataPacket & { email: string; firstName: string; lastName: string; phone: string | null; profileImageUrl: string | null }>("SELECT email, firstName, lastName, phone, profileImageUrl FROM `User` WHERE id = ? LIMIT 1", [claims.sub]),
    query<RowDataPacket & { line1: string; city: string; state: string | null; postalCode: string; countryCode: string; phone: string | null }>("SELECT a.line1, a.city, a.state, a.postalCode, a.countryCode, a.phone FROM Address a JOIN Customer c ON c.id = a.customerId WHERE c.userId = ? AND a.isDefault = 1 LIMIT 1", [claims.sub])
  ]);
  if (!users[0]) redirect("/login?returnTo=%2Faccount");
  const user = users[0];
  const address = addresses[0];

  return <main className="account-page content-width"><div className="section-kicker">Your account</div><h1>Everything in <em>one place.</em></h1><p className="account-page-copy">Manage your profile, review past purchases and keep your delivery details ready for the next order.</p><div className="account-page-grid"><section><p className="eyebrow">Settings</p><h2>Account details</h2><p>Update your profile and saved delivery information.</p><AccountForm initialValues={{ ...user, ...(address ?? {}) }} /></section><section><p className="eyebrow">History</p><h2>Your transactions</h2><p>Track your latest order and review what you have purchased from Princess & Brothers.</p><Link className="button button-navy" href="/orders">View order history <span aria-hidden="true">→</span></Link></section></div></main>;
}