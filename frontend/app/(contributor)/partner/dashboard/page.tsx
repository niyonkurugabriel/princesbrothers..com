import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@princess-brothers/db";
import type { RowDataPacket } from "mysql2/promise";
import { ContributorCommunications } from "@/features/contributor/components/communications";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";

export default async function ContributorDashboardPage() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "contributor" || claims.sub.startsWith("guest:")) redirect("/login?returnTo=%2Fpartner%2Fdashboard");
  const rows = await query<RowDataPacket & { id: string; body: string; createdAt: Date; adminName: string | null; contributorName: string | null; senderUserId: string | null; messageType: "MESSAGE" | "REPORT"; attachmentUrl: string | null; attachmentName: string | null }>("SELECT m.id, m.body, m.createdAt, a.fullName AS adminName, CONCAT(u.firstName, ' ', u.lastName) AS contributorName, m.senderUserId, m.messageType, m.attachmentUrl, m.attachmentName FROM PartnerAdminMessage m JOIN Contributor c ON c.id = m.contributorId LEFT JOIN AdminUser a ON a.id = m.senderAdminId LEFT JOIN `User` u ON u.id = m.senderUserId WHERE c.userId = ? ORDER BY m.createdAt ASC LIMIT 100", [claims.sub]);
  const messages = rows.map((row) => ({ id: row.id, body: row.body, createdAt: row.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), sender: row.senderUserId ? row.contributorName ?? "You" : row.adminName ?? "Princess & Brothers", senderType: row.senderUserId ? "CONTRIBUTOR" as const : "ADMIN" as const, messageType: row.messageType, attachmentUrl: row.attachmentUrl, attachmentName: row.attachmentName }));
  return <main className="partner-dashboard"><ContributorCommunications messages={messages} /></main>;
}