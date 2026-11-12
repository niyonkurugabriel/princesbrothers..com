const fs = require("node:fs/promises");
const path = require("node:path");
const { getPool } = require("../db/db");

const imagePathPattern = /^\/uploads\/(products|drivers)\/([a-f0-9-]{36}\.(jpg|png|webp))$/i;
const storedImagePathPattern = /^\/api\/images\/(products|drivers)\/([a-f0-9-]{36}\.(jpg|png|webp))$/i;
const contentTypes = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const maxImageBytes = 5 * 1024 * 1024;

function storageRoot() {
  const configuredDirectory = process.env.PRODUCT_IMAGE_STORAGE_DIR;
  if (configuredDirectory && !path.isAbsolute(configuredDirectory)) {
    throw new Error("PRODUCT_IMAGE_STORAGE_DIR must be an absolute path.");
  }
  return path.resolve(configuredDirectory || path.join(__dirname, "..", "frontend", "storage", "product-images"));
}

function migrationSourceBase() {
  const value = process.env.PRODUCT_IMAGE_MIGRATION_SOURCE_BASE_URL;
  if (!value) return null;
  const baseUrl = new URL(value);
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("PRODUCT_IMAGE_MIGRATION_SOURCE_BASE_URL must be an HTTPS URL without credentials, query, or fragment.");
  }
  return baseUrl;
}

function remoteSourceUrl(imagePath, prefix, fileName, baseUrl) {
  if (!baseUrl) return null;
  try {
    const url = new URL(imagePath);
    const basePath = baseUrl.pathname.replace(/\/+$/, "");
    if (
      url.origin !== baseUrl.origin ||
      url.pathname !== `${basePath}/${prefix}/${fileName}` ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) return null;
    return url;
  } catch {
    return null;
  }
}

function imageMatchesExtension(bytes, extension) {
  if (extension === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

async function sourceBytes(imagePath, prefix, fileName, sourceDirectory, sourceBaseUrl) {
  if (imagePathPattern.test(imagePath)) {
    return fs.readFile(path.join(sourceDirectory, fileName));
  }
  const url = remoteSourceUrl(imagePath, prefix, fileName, sourceBaseUrl);
  if (!url) throw new Error("Image source is not an allowed local path or configured legacy image URL.");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Legacy image request failed with status ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxImageBytes) throw new Error("Legacy image is larger than 5 MB.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxImageBytes) throw new Error("Legacy image is empty or larger than 5 MB.");
  return bytes;
}

async function writeImage(storageDirectory, prefix, fileName, bytes) {
  const directory = path.join(storageDirectory, prefix);
  await fs.mkdir(directory, { recursive: true });
  const targetPath = path.join(directory, fileName.toLowerCase());
  try {
    await fs.writeFile(targetPath, bytes, { flag: "wx", mode: 0o644 });
  } catch (error) {
    if (!(error && error.code === "EEXIST")) throw error;
    const existing = await fs.readFile(targetPath);
    if (!existing.equals(bytes)) throw new Error(`Local destination already exists with different contents: ${prefix}/${fileName}`);
  }
}

async function migrateEntry(pool, entry, apply, sourceDirectories, storageDirectory, sourceBaseUrl) {
  const legacyMatch = imagePathPattern.exec(entry.imagePath);
  const localMatch = storedImagePathPattern.exec(entry.imagePath);
  const expectedPrefix = entry.kind === "driver" ? "drivers" : "products";
  let remoteFileName = null;
  if (!legacyMatch && /^https:\/\//i.test(entry.imagePath)) {
    try {
      remoteFileName = /^([a-f0-9-]{36}\.(?:jpg|png|webp))$/i.exec(new URL(entry.imagePath).pathname.split("/").pop() ?? "")?.[1] ?? null;
    } catch {
      remoteFileName = null;
    }
  }

  if (localMatch) {
    if (localMatch[1].toLowerCase() !== expectedPrefix) {
      console.warn(`Skipped ${entry.kind} ${entry.id}: local image prefix does not match the record type.`);
      return "skipped";
    }
    console.log(`Already local ${entry.kind} ${entry.id}.`);
    return "skipped";
  }
  const prefix = legacyMatch ? legacyMatch[1].toLowerCase() : remoteFileName ? expectedPrefix : "";
  const fileName = legacyMatch ? legacyMatch[2] : remoteFileName;
  if (!prefix || !fileName) {
    console.warn(`Skipped ${entry.kind} ${entry.id}: unsupported image reference.`);
    return "skipped";
  }
  if (prefix !== expectedPrefix) {
    console.warn(`Skipped ${entry.kind} ${entry.id}: image prefix does not match the record type.`);
    return "skipped";
  }

  const sourceDirectory = sourceDirectories[prefix];
  if (!legacyMatch && !remoteSourceUrl(entry.imagePath, prefix, fileName, sourceBaseUrl)) {
    console.warn(`Skipped ${entry.kind} ${entry.id}: remote image is not under the configured migration source URL.`);
    return "skipped";
  }
  if (!apply && !legacyMatch) {
    console.log(`Would download ${entry.kind} ${entry.id} from the configured legacy image URL.`);
    return "migrated";
  }

  let bytes;
  try {
    bytes = await sourceBytes(entry.imagePath, prefix, fileName, sourceDirectory, sourceBaseUrl);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      console.error(`Missing local source image for ${entry.kind} ${entry.id}: ${entry.imagePath}`);
      return "missing";
    }
    throw error;
  }
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  if (bytes.length > maxImageBytes || !imageMatchesExtension(bytes, extension)) {
    console.error(`Invalid or oversized source image for ${entry.kind} ${entry.id}.`);
    return "missing";
  }
  if (!apply) {
    console.log(`Would migrate ${entry.kind} ${entry.id}: ${entry.imagePath}`);
    return "migrated";
  }

  await writeImage(storageDirectory, prefix, fileName, bytes);
  const newPath = `/api/images/${prefix}/${fileName.toLowerCase()}`;
  const [result] = await pool.execute(
    `UPDATE \`${entry.table}\` SET \`${entry.column}\` = ?, updatedAt = ? WHERE id = ? AND \`${entry.column}\` = ?`,
    [newPath, new Date(), entry.id, entry.imagePath],
  );
  if (result.affectedRows !== 1) {
    console.warn(`Skipped ${entry.kind} ${entry.id}: its image reference changed during migration.`);
    return "skipped";
  }
  console.log(`Migrated ${entry.kind} ${entry.id} to local storage.`);
  return "migrated";
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (process.argv.slice(2).some((argument) => argument !== "--apply")) throw new Error("Use only the optional --apply flag.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const sourceDirectories = {
    products: path.resolve(process.env.PRODUCT_IMAGE_UPLOAD_SOURCE_DIR || path.join(__dirname, "..", "frontend", "public", "uploads", "products")),
    drivers: path.resolve(path.join(__dirname, "..", "frontend", "public", "uploads", "drivers")),
  };
  const targetDirectory = storageRoot();
  const sourceBaseUrl = migrationSourceBase();
  const pool = getPool();
  try {
    const [products] = await pool.execute("SELECT id, imagePath FROM Product WHERE imagePath IS NOT NULL AND imagePath <> '' ORDER BY id");
    const [drivers] = await pool.execute("SELECT id, photoUrl AS imagePath FROM Driver WHERE photoUrl IS NOT NULL AND photoUrl <> '' ORDER BY id");
    const entries = [
      ...products.map((row) => ({ kind: "product", table: "Product", column: "imagePath", ...row })),
      ...drivers.map((row) => ({ kind: "driver", table: "Driver", column: "photoUrl", ...row })),
    ];
    let migrated = 0;
    let skipped = 0;
    let missing = 0;

    for (const entry of entries) {
      const result = await migrateEntry(pool, entry, apply, sourceDirectories, targetDirectory, sourceBaseUrl);
      if (result === "migrated") migrated += 1;
      else if (result === "missing") missing += 1;
      else skipped += 1;
    }

    console.log(`${apply ? "Migrated" : "Ready to migrate"} ${migrated} images; skipped ${skipped}; missing or invalid sources ${missing}.`);
    if (!apply) console.log("Dry run only. Re-run with --apply to copy/download images and update database references.");
    if (missing) process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Product image migration failed.", error);
  process.exitCode = 1;
});
