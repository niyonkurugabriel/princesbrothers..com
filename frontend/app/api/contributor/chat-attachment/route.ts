import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import type { RowDataPacket } from "mysql2/promise";

const allowedTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt"
};

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  const contributorCanUpload = claims?.portal === "contributor" && claims.contributorApproved;
  const adminCanUpload = claims?.portal === "admin" && claims.permissions.includes("partners:review");
  if (!claims || (!contributorCanUpload && !adminCanUpload)) return NextResponse.json({ error: "Approved contributor or partner-admin access is required." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes[file.type] || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Choose a JPG, PNG, WebP, PDF, DOC, DOCX, or TXT file under 10 MB." }, { status: 400 });
  }

  const name = `${randomUUID()}${allowedTypes[file.type]}`;
  const directory = join(process.cwd(), "storage", "contributor-chat");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, name), new Uint8Array(await file.arrayBuffer()), { flag: "wx" });
  return NextResponse.json({ url: `/api/contributor/chat-attachment/${name}`, name: file.name.slice(0, 255) });
}