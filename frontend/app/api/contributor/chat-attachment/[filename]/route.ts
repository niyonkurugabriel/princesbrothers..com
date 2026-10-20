import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@princess-brothers/db";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import type { RowDataPacket } from "mysql2/promise";

const contentTypes: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain" };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf|doc|docx|txt)$/i.test(filename)) return new NextResponse("Not found", { status: 404 });
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims) return new NextResponse("Unauthorized", { status: 401 });
  if (claims.portal === "contributor") {
    if (!claims.contributorApproved) return new NextResponse("Forbidden", { status: 403 });
    const url = `/api/contributor/chat-attachment/${filename}`;
    const rows = await query<RowDataPacket & { id: string }>("SELECT m.id FROM PartnerAdminMessage m JOIN Contributor c ON c.id = m.contributorId WHERE c.userId = ? AND m.attachmentUrl = ? LIMIT 1", [claims.sub, url]);
    if (!rows.length) return new NextResponse("Forbidden", { status: 403 });
  } else if (claims.portal !== "admin" || !claims.permissions.some((permission) => ["partners:read", "partners:review"].includes(permission))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const file = await readFile(join(process.cwd(), "storage", "contributor-chat", filename));
    const extension = filename.split(".").at(-1) ?? "";
    return new NextResponse(file, { headers: { "Content-Type": contentTypes[extension], "Content-Disposition": `${extension === "jpg" || extension === "png" || extension === "webp" ? "inline" : "attachment"}; filename="${filename}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}