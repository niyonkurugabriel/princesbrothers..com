import { NextResponse } from "next/server";
import { readStoredImage } from "@/features/admin/server/product-image-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; filename: string }> }) {
  const { type, filename } = await params;
  if (type !== "products" && type !== "drivers") {
    return NextResponse.json({ error: "Image was not found." }, { status: 404 });
  }

  try {
    const image = await readStoredImage(type, filename);
    if (!image) return NextResponse.json({ error: "Image was not found." }, { status: 404 });
    const body = new Uint8Array(image.bytes.byteLength);
    body.set(image.bytes);
    return new NextResponse(body.buffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": image.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Stored image could not be read.", error);
    return NextResponse.json({ error: "Image storage is unavailable." }, { status: 500 });
  }
}
