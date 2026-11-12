import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type ProductImageExtension = "jpg" | "png" | "webp";

type ProductImageStorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: URL;
};

let client: S3Client | undefined;

function getStorageConfig(): ProductImageStorageConfig {
  const bucket = process.env.PRODUCT_IMAGE_S3_BUCKET;
  const region = process.env.PRODUCT_IMAGE_S3_REGION;
  const accessKeyId = process.env.PRODUCT_IMAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.PRODUCT_IMAGE_S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.PRODUCT_IMAGE_S3_ENDPOINT;
  const publicBaseUrlValue = process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL;

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !publicBaseUrlValue) {
    throw new ProductImageStorageConfigurationError("Product image object storage is not fully configured.");
  }

  let publicBaseUrl: URL;
  try {
    publicBaseUrl = new URL(publicBaseUrlValue);
  } catch {
    throw new ProductImageStorageConfigurationError("PRODUCT_IMAGE_PUBLIC_BASE_URL must be an absolute URL.");
  }
  if (
    !["http:", "https:"].includes(publicBaseUrl.protocol) ||
    (process.env.NODE_ENV === "production" && publicBaseUrl.protocol !== "https:") ||
    publicBaseUrl.username ||
    publicBaseUrl.password ||
    publicBaseUrl.search ||
    publicBaseUrl.hash
  ) {
    throw new ProductImageStorageConfigurationError("Product image public URL must use HTTPS in production and cannot contain credentials, query, or fragment.");
  }
  if (endpoint) {
    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      throw new ProductImageStorageConfigurationError("PRODUCT_IMAGE_S3_ENDPOINT must be an absolute URL.");
    }
    if (!["http:", "https:"].includes(endpointUrl.protocol) || (process.env.NODE_ENV === "production" && endpointUrl.protocol !== "https:")) {
      throw new ProductImageStorageConfigurationError("Product image storage endpoint must use HTTPS in production.");
    }
  }

  return { bucket, region, accessKeyId, secretAccessKey, endpoint, publicBaseUrl };
}

function getS3Client(config: ProductImageStorageConfig): S3Client {
  if (!client) {
    client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
    });
  }
  return client;
}

export class ProductImageStorageConfigurationError extends Error {}

export function isValidProductImageReference(imagePath: string): boolean {
  if (!imagePath) return true;
  const localPath = /^\/uploads\/products\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/i;
  if (localPath.test(imagePath)) return true;

  const baseUrlValue = process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL;
  if (!baseUrlValue) return false;
  try {
    const url = new URL(imagePath);
    const baseUrl = new URL(baseUrlValue);
    if (
      !["http:", "https:"].includes(baseUrl.protocol) ||
      (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.search ||
      baseUrl.hash
    ) return false;
    const fileName = /^([a-f0-9-]{36}\.(?:jpg|png|webp))$/i.exec(url.pathname.split("/").pop() ?? "");
    if (!fileName) return false;
    const basePath = baseUrl.pathname.replace(/\/+$/, "");
    return url.origin === baseUrl.origin &&
      url.pathname === `${basePath}/products/${fileName[0]}` &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export async function uploadProductImage(
  fileName: string,
  bytes: Buffer,
  extension: ProductImageExtension,
): Promise<string> {
  const config = getStorageConfig();
  await getS3Client(config).send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: `products/${fileName}`,
    Body: bytes,
    ContentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
    CacheControl: "public, max-age=31536000, immutable"
  }));
  return new URL(`products/${fileName}`, `${config.publicBaseUrl.toString().replace(/\/+$/, "")}/`).toString();
}
