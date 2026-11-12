import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getStoredImageRoute } from "@/app/api/images/[type]/[filename]/route";
import {
  isValidDriverPhotoReference,
  isValidProductImageReference,
  readStoredImage,
  uploadDriverProfileImage,
  uploadProductImage,
} from "@/features/admin/server/product-image-storage";

const originalStorageDirectory = process.env.PRODUCT_IMAGE_STORAGE_DIR;
let temporaryStorageDirectory = "";

afterEach(async () => {
  if (originalStorageDirectory === undefined) delete process.env.PRODUCT_IMAGE_STORAGE_DIR;
  else process.env.PRODUCT_IMAGE_STORAGE_DIR = originalStorageDirectory;
  if (temporaryStorageDirectory) await rm(temporaryStorageDirectory, { recursive: true, force: true });
  temporaryStorageDirectory = "";
});

describe("local product image storage", () => {
  it("accepts only local image references and legacy local upload paths", () => {
    expect(isValidProductImageReference("/api/images/products/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(true);
    expect(isValidProductImageReference("/uploads/products/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(true);
    expect(isValidProductImageReference("/api/images/products/../../secret.jpg")).toBe(false);
    expect(isValidProductImageReference("https://images.example.com/products/123e4567-e89b-12d3-a456-426614174000.webp")).toBe(false);
  });

  it("accepts driver photo URLs only from the local image route", () => {
    expect(isValidDriverPhotoReference("/api/images/drivers/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(true);
    expect(isValidDriverPhotoReference("/api/images/products/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(false);
    expect(isValidDriverPhotoReference("https://images.example.com/drivers/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(false);
  });

  it("writes product and driver images locally and reads their bytes back", async () => {
    temporaryStorageDirectory = await mkdtemp(path.join(os.tmpdir(), "pb-image-test-"));
    process.env.PRODUCT_IMAGE_STORAGE_DIR = temporaryStorageDirectory;
    const bytes = Buffer.from("local image bytes");
    const productPath = await uploadProductImage("123e4567-e89b-12d3-a456-426614174000.jpg", bytes, "jpg");
    const driverPath = await uploadDriverProfileImage("123e4567-e89b-12d3-a456-426614174001.webp", bytes, "webp");

    expect(productPath).toBe("/api/images/products/123e4567-e89b-12d3-a456-426614174000.jpg");
    expect(driverPath).toBe("/api/images/drivers/123e4567-e89b-12d3-a456-426614174001.webp");
    await expect(readStoredImage("products", "123e4567-e89b-12d3-a456-426614174000.jpg")).resolves.toEqual({
      bytes,
      contentType: "image/jpeg",
    });
    await expect(readStoredImage("drivers", "123e4567-e89b-12d3-a456-426614174001.webp")).resolves.toEqual({
      bytes,
      contentType: "image/webp",
    });
    await expect(readStoredImage("products", "../secret.jpg")).resolves.toBeNull();

    const response = await getStoredImageRoute(new Request(`http://localhost${productPath}`), {
      params: Promise.resolve({ type: "products", filename: "123e4567-e89b-12d3-a456-426614174000.jpg" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });
});
