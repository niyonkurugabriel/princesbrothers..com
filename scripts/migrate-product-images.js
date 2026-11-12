const fs = require("node:fs/promises");
const path = require("node:path");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getPool } = require("../db/db");

const imagePathPattern = /^\/uploads\/products\/([a-f0-9-]{36}\.(jpg|png|webp))$/i;
const contentTypes = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

function storageConfig() {
  const { PRODUCT_IMAGE_S3_BUCKET: bucket, PRODUCT_IMAGE_S3_REGION: region, PRODUCT_IMAGE_S3_ENDPOINT: endpoint, PRODUCT_IMAGE_S3_ACCESS_KEY_ID: accessKeyId, PRODUCT_IMAGE_S3_SECRET_ACCESS_KEY: secretAccessKey, PRODUCT_IMAGE_PUBLIC_BASE_URL: publicBaseUrlValue } = process.env;
  if (!bucket || !region || !accessKeyId || !secretAccessKey || !publicBaseUrlValue) {
    throw new Error("Set PRODUCT_IMAGE_S3_BUCKET, PRODUCT_IMAGE_S3_REGION, PRODUCT_IMAGE_S3_ACCESS_KEY_ID, PRODUCT_IMAGE_S3_SECRET_ACCESS_KEY, and PRODUCT_IMAGE_PUBLIC_BASE_URL.");
  }
  const publicBaseUrl = new URL(publicBaseUrlValue);
  if (publicBaseUrl.protocol !== "https:" || publicBaseUrl.username || publicBaseUrl.password || publicBaseUrl.search || publicBaseUrl.hash) {
    throw new Error("PRODUCT_IMAGE_PUBLIC_BASE_URL must be an HTTPS URL without credentials, query, or fragment.");
  }
  if (endpoint && new URL(endpoint).protocol !== "https:") throw new Error("PRODUCT_IMAGE_S3_ENDPOINT must use HTTPS.");
  return { bucket, region, endpoint, accessKeyId, secretAccessKey, publicBaseUrl };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (process.argv.slice(2).some((argument) => argument !== "--apply")) throw new Error("Use only the optional --apply flag.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const sourceDirectory = path.resolve(process.env.PRODUCT_IMAGE_UPLOAD_SOURCE_DIR || path.join(__dirname, "..", "frontend", "public", "uploads", "products"));
  const pool = getPool();
  try {
    const [products] = await pool.execute("SELECT id, imagePath FROM Product WHERE imagePath LIKE '/uploads/products/%' ORDER BY id");
    const missing = [];
    let migrated = 0;
    let skipped = 0;
    let client;
    let config;

    for (const product of products) {
      const match = imagePathPattern.exec(product.imagePath);
      if (!match) {
        console.warn(`Skipped product ${product.id}: unsupported local image path.`);
        skipped += 1;
        continue;
      }

      const fileName = match[1];
      let bytes;
      try {
        bytes = await fs.readFile(path.join(sourceDirectory, fileName));
      } catch (error) {
        if (error && error.code === "ENOENT") {
          missing.push({ id: product.id, path: product.imagePath });
          continue;
        }
        throw error;
      }

      if (!apply) {
        console.log(`Would migrate ${product.id}: ${product.imagePath}`);
        migrated += 1;
        continue;
      }

      if (!config) {
        config = storageConfig();
        client = new S3Client({
          region: config.region,
          ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
          credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
        });
      }
      const extension = match[2].toLowerCase();
      await client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: `products/${fileName}`,
        Body: bytes,
        ContentType: contentTypes[extension],
        CacheControl: "public, max-age=31536000, immutable"
      }));
      const imagePath = new URL(`products/${fileName}`, `${config.publicBaseUrl.toString().replace(/\/+$/, "")}/`).toString();
      const [result] = await pool.execute("UPDATE Product SET imagePath = ?, updatedAt = ? WHERE id = ? AND imagePath = ?", [imagePath, new Date(), product.id, product.imagePath]);
      if (result.affectedRows === 1) {
        console.log(`Migrated product ${product.id}.`);
        migrated += 1;
      } else {
        console.warn(`Skipped product ${product.id}: its image changed during migration.`);
        skipped += 1;
      }
    }

    console.log(`${apply ? "Migrated" : "Ready to migrate"} ${migrated} product images; skipped ${skipped}; missing source files ${missing.length}.`);
    if (missing.length) {
      for (const item of missing) console.error(`Missing image for product ${item.id}: ${item.path}`);
      process.exitCode = 2;
    }
    if (!apply) console.log("Dry run only. Re-run with --apply to upload images and update database URLs.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Product image migration failed.", error);
  process.exitCode = 1;
});
