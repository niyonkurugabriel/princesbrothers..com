import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ImageExtension = "jpg" | "png" | "webp";
type ImagePrefix = "products" | "drivers";

const imageFileNamePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(jpg|png|webp)$/i;
const storedImagePathPattern = /^\/api\/images\/(products|drivers)\/([a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(?:jpg|png|webp))$/i;

export class ProductImageStorageConfigurationError extends Error {}

function getStorageRoot(): string {
  const configuredDirectory = process.env.PRODUCT_IMAGE_STORAGE_DIR?.trim();
  if (process.env.NODE_ENV === "production" && !configuredDirectory) {
    throw new ProductImageStorageConfigurationError("Set PRODUCT_IMAGE_STORAGE_DIR to a writable persistent server directory.");
  }
  if (configuredDirectory && !path.isAbsolute(configuredDirectory)) {
    throw new ProductImageStorageConfigurationError("PRODUCT_IMAGE_STORAGE_DIR must be an absolute path.");
  }
  return path.resolve(configuredDirectory || path.join(process.cwd(), "storage", "product-images"));
}

function contentType(extension: ImageExtension): string {
  return extension === "jpg" ? "image/jpeg" : `image/${extension}`;
}

function isValidImageFileName(fileName: string): boolean {
  return imageFileNamePattern.test(fileName);
}

function isValidImageReference(imagePath: string, prefix: ImagePrefix, allowLegacyPath: boolean): boolean {
  if (!imagePath) return true;
  const storedPath = storedImagePathPattern.exec(imagePath);
  if (storedPath?.[1].toLowerCase() === prefix) return true;
  return allowLegacyPath && new RegExp(`^/uploads/${prefix}/[a-f0-9-]{36}\\.(?:jpg|png|webp)$`, "i").test(imagePath);
}

async function storeImage(
  prefix: ImagePrefix,
  fileName: string,
  bytes: Buffer,
  extension: ImageExtension,
): Promise<string> {
  const match = /^.+\.(jpg|png|webp)$/i.exec(fileName);
  if (!isValidImageFileName(fileName) || match?.[1].toLowerCase() !== extension) {
    throw new Error("Image filename and extension are invalid.");
  }
  const directory = path.join(getStorageRoot(), prefix);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName.toLowerCase()), bytes, { flag: "wx", mode: 0o644 });
  return `/api/images/${prefix}/${fileName.toLowerCase()}`;
}

export function isValidProductImageReference(imagePath: string): boolean {
  return isValidImageReference(imagePath, "products", true);
}

export function isValidDriverPhotoReference(imagePath: string): boolean {
  return isValidImageReference(imagePath, "drivers", true);
}

export async function uploadProductImage(fileName: string, bytes: Buffer, extension: ImageExtension): Promise<string> {
  return storeImage("products", fileName, bytes, extension);
}

export async function uploadDriverProfileImage(fileName: string, bytes: Buffer, extension: ImageExtension): Promise<string> {
  return storeImage("drivers", fileName, bytes, extension);
}

export async function readStoredImage(prefix: ImagePrefix, fileName: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!isValidImageFileName(fileName)) return null;
  const normalizedFileName = fileName.toLowerCase();
  const extension: ImageExtension = normalizedFileName.endsWith(".jpg") ? "jpg" : normalizedFileName.endsWith(".png") ? "png" : "webp";
  try {
    const bytes = await readFile(path.join(getStorageRoot(), prefix, normalizedFileName));
    return { bytes, contentType: contentType(extension) };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
