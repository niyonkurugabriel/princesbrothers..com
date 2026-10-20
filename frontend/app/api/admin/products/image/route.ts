import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";

export const runtime = "nodejs";

const maxImageBytes = 5 * 1024 * 1024;

function imageExtension(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "admin" || !claims.permissions.includes("catalog:write")) {
    return NextResponse.json({ error: "Admin catalog permission required." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxImageBytes + 64 * 1024) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a valid image file." }, { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > maxImageBytes) {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP image up to 5 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = imageExtension(bytes);
  if (!extension) {
    return NextResponse.json({ error: "Choose a valid JPEG, PNG, or WebP image." }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });

  return NextResponse.json({ imagePath: `/uploads/products/${filename}` });
}
