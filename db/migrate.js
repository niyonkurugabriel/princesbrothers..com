const fs = require("node:fs/promises");
const path = require("node:path");
const { getPool } = require("./db");

async function main() {
  const pool = getPool();
  await pool.execute("CREATE TABLE IF NOT EXISTS `_pb_migrations` (name VARCHAR(255) NOT NULL PRIMARY KEY, appliedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3))");
  const [tables] = await pool.execute("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('User', 'Product')");
  const existingSchema = Number(tables[0]?.count) === 2;

  if (existingSchema) {
    await upgradeExistingSchema(pool);
    await pool.execute("INSERT INTO `_pb_migrations` (name) VALUES ('database_pb.sql') ON DUPLICATE KEY UPDATE name = VALUES(name)");
    console.log("Updated existing database for the current application schema.");
  } else {
    const sql = await fs.readFile(path.join(__dirname, "database_pb.sql"), "utf8");
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) await pool.query(statement);
    console.log("Applied database_pb.sql.");
  }
  const privacySql = await fs.readFile(path.join(__dirname, "privacy_tables.sql"), "utf8");
  const privacyStatements = privacySql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
  for (const statement of privacyStatements) await pool.query(statement);
  console.log("Ensured privacy and consent tables.");
}

async function ensureColumn(pool, table, column, definition) {
  const [columns] = await pool.execute("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1", [table, column]);
  if (!columns.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function upgradeExistingSchema(pool) {
  await ensureColumn(pool, "AdminUser", "profileImageUrl", "VARCHAR(512) NULL");
  await pool.query("CREATE TABLE IF NOT EXISTS `FinanceTransaction` (`id` VARCHAR(36) NOT NULL, `adminId` VARCHAR(36) NOT NULL, `type` ENUM('INCOME', 'EXPENSE') NOT NULL, `category` VARCHAR(100) NOT NULL, `description` VARCHAR(1000) NOT NULL, `amount` DECIMAL(12, 2) NOT NULL, `transactionDate` DATE NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX `FinanceTransaction_adminId_transactionDate_idx` (`adminId`, `transactionDate`), PRIMARY KEY (`id`), CONSTRAINT `FinanceTransaction_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`) SELECT UUID(), 'Accountant', 'Record and report income and expenses. Finance records are private to their creator.', '[\"finance:read\",\"finance:write\"]', 1 WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Accountant')");
  await pool.query("CREATE TABLE IF NOT EXISTS `DriverLocation` (`id` VARCHAR(36) NOT NULL, `driverId` VARCHAR(36) NOT NULL, `locationName` VARCHAR(160) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, UNIQUE INDEX `DriverLocation_driverId_locationName_key`(`driverId`, `locationName`), INDEX `DriverLocation_locationName_idx`(`locationName`), PRIMARY KEY (`id`), CONSTRAINT `DriverLocation_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS `DriverPayoutAccount` (`id` VARCHAR(36) NOT NULL, `driverId` VARCHAR(36) NOT NULL, `provider` VARCHAR(100) NOT NULL, `accountHolder` VARCHAR(150) NOT NULL, `accountPhone` VARCHAR(32) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, INDEX `DriverPayoutAccount_driverId_idx`(`driverId`), PRIMARY KEY (`id`), CONSTRAINT `DriverPayoutAccount_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  const [auditActorConstraints] = await pool.execute("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AuditLog' AND COLUMN_NAME = 'actorId' AND REFERENCED_TABLE_NAME IS NOT NULL");
  for (const constraint of auditActorConstraints) await pool.query(`ALTER TABLE \`AuditLog\` DROP FOREIGN KEY \`${constraint.CONSTRAINT_NAME}\``);
  await pool.query("ALTER TABLE `Order` MODIFY COLUMN `currency` ENUM('RWF', 'USD', 'EUR', 'GBP', 'CAD', 'KES', 'UGX', 'TZS', 'BIF', 'NGN', 'GHS', 'ZAR') NOT NULL");
  await pool.query("ALTER TABLE `Payment` MODIFY COLUMN `currency` ENUM('RWF', 'USD', 'EUR', 'GBP', 'CAD', 'KES', 'UGX', 'TZS', 'BIF', 'NGN', 'GHS', 'ZAR') NOT NULL");
  await pool.query("ALTER TABLE `Payment` MODIFY COLUMN `gateway` ENUM('MTN_MOMO', 'AIRTEL_MONEY', 'MPESA', 'FLUTTERWAVE', 'PAYSTACK', 'LOCAL_CARD', 'STRIPE', 'PAYPAL', 'CASH_ON_DELIVERY', 'MANUAL') NOT NULL");
  await ensureColumn(pool, "Payment", "status", "ENUM('INITIATED', 'PENDING_APPROVAL', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED'");
  await ensureColumn(pool, "Payment", "paymentMethod", "VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'");
  await ensureColumn(pool, "Payment", "updatedAt", "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
  await pool.query("UPDATE Payment p JOIN `Order` o ON o.id = p.orderId SET p.status = CASE WHEN o.status IN ('PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED') THEN 'PAID' WHEN o.status = 'REFUNDED' THEN 'REFUNDED' ELSE 'INITIATED' END WHERE p.status = 'INITIATED'");

  await pool.query("ALTER TABLE `PartnerAdminMessage` MODIFY COLUMN `senderAdminId` VARCHAR(36) NULL");
  await ensureColumn(pool, "PartnerAdminMessage", "senderUserId", "VARCHAR(36) NULL");
  await ensureColumn(pool, "PartnerAdminMessage", "messageType", "ENUM('MESSAGE', 'REPORT') NOT NULL DEFAULT 'MESSAGE'");
  await ensureColumn(pool, "PartnerAdminMessage", "attachmentUrl", "VARCHAR(512) NULL");
  await ensureColumn(pool, "PartnerAdminMessage", "attachmentName", "VARCHAR(255) NULL");
  await pool.query("CREATE TABLE IF NOT EXISTS `SystemSetting` (`settingKey` VARCHAR(100) NOT NULL, `value` VARCHAR(512) NOT NULL, `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`settingKey`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS `PasswordResetToken` (`tokenHash` CHAR(64) NOT NULL, `userId` VARCHAR(36) NOT NULL, `expiresAt` DATETIME(3) NOT NULL, `consumedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`tokenHash`), INDEX `PasswordResetToken_userId_idx` (`userId`), INDEX `PasswordResetToken_expiresAt_idx` (`expiresAt`), CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS `PasswordResetMonthlyLimit` (`emailHash` CHAR(64) NOT NULL, `monthStart` DATE NOT NULL, `requestCount` TINYINT UNSIGNED NOT NULL DEFAULT 0, PRIMARY KEY (`emailHash`, `monthStart`), INDEX `PasswordResetMonthlyLimit_monthStart_idx` (`monthStart`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS `AuthRateLimit` (`id` CHAR(64) NOT NULL, `windowStartedAt` DATETIME(3) NOT NULL, `requestCount` INT UNSIGNED NOT NULL DEFAULT 0, PRIMARY KEY (`id`), INDEX `AuthRateLimit_windowStartedAt_idx` (`windowStartedAt`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
}

main()
  .catch((error) => {
    console.error(`MySQL migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getPool().end();
  });