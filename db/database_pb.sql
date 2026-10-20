-- Princess & Brothers full XAMPP import
-- Import into an EMPTY database. This script does not drop existing databases or tables.
-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `status` ENUM('ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'INVITED',
    `emailVerifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_status_idx`(`status`),
    INDEX `User_lastName_firstName_idx`(`lastName`, `firstName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(36) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL DEFAULT 'System Admin',
    `profileImageUrl` VARCHAR(512) NULL,
    `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminUser_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(150) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `Permission_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userId` VARCHAR(36) NOT NULL,
    `roleId` VARCHAR(36) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assignedBy` VARCHAR(36) NULL,

    INDEX `UserRole_roleId_idx`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` VARCHAR(36) NOT NULL,
    `permissionId` VARCHAR(36) NOT NULL,

    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(36) NOT NULL,
    `customerId` VARCHAR(36) NOT NULL,
    `type` ENUM('BILLING', 'SHIPPING', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `label` VARCHAR(80) NULL,
    `recipient` VARCHAR(200) NOT NULL,
    `line1` VARCHAR(200) NOT NULL,
    `line2` VARCHAR(200) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NULL,
    `postalCode` VARCHAR(32) NOT NULL,
    `countryCode` CHAR(2) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Address_customerId_type_idx`(`customerId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cart` (
    `id` VARCHAR(36) NOT NULL,
    `customerId` VARCHAR(36) NOT NULL,
    `status` ENUM('ACTIVE', 'ABANDONED', 'CONVERTED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cart_customerId_status_idx`(`customerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CartItem` (
    `id` VARCHAR(36) NOT NULL,
    `cartId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CartItem_productId_idx`(`productId`),
    UNIQUE INDEX `CartItem_cartId_productId_key`(`cartId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` VARCHAR(191) NULL,
    `imagePath` VARCHAR(512) NULL,
    `retailPrice` DECIMAL(12, 2) NOT NULL,
    `currency` ENUM('RWF', 'USD', 'EUR', 'GBP', 'CAD') NOT NULL DEFAULT 'RWF',
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_isActive_name_idx`(`isActive`, `name`),
    INDEX `Product_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Category_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCategory` (
    `productId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,

    INDEX `ProductCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`productId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `contributorId` VARCHAR(36) NULL,
    `source` ENUM('INTERNAL', 'CONTRIBUTOR') NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `reserved` INTEGER NOT NULL DEFAULT 0,
    `warehouseCode` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItem_productId_source_idx`(`productId`, `source`),
    INDEX `InventoryItem_contributorId_idx`(`contributorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contributor` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `companyName` VARCHAR(200) NOT NULL,
    `registrationNumber` VARCHAR(100) NOT NULL,
    `businessEmail` VARCHAR(320) NOT NULL,
    `location` VARCHAR(200) NOT NULL,
    `businessDetails` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Contributor_userId_key`(`userId`),
    UNIQUE INDEX `Contributor_registrationNumber_key`(`registrationNumber`),
    INDEX `Contributor_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContributorSubmission` (
    `id` VARCHAR(36) NOT NULL,
    `contributorId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NULL,
    `productName` VARCHAR(200) NOT NULL,
    `description` VARCHAR(191) NULL,
    `proposedWholesalePrice` DECIMAL(12, 2) NOT NULL,
    `currency` ENUM('RWF', 'USD', 'EUR', 'GBP', 'CAD') NOT NULL DEFAULT 'USD',
    `quantity` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(36) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContributorSubmission_contributorId_status_idx`(`contributorId`, `status`),
    INDEX `ContributorSubmission_productId_idx`(`productId`),
    INDEX `ContributorSubmission_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `licenseNumber` VARCHAR(100) NOT NULL,
    `pinHash` VARCHAR(191) NULL,
    `vehicleInfo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Driver_userId_key`(`userId`),
    UNIQUE INDEX `Driver_licenseNumber_key`(`licenseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverLocation` (
    `id` VARCHAR(36) NOT NULL,
    `driverId` VARCHAR(36) NOT NULL,
    `locationName` VARCHAR(160) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DriverLocation_driverId_locationName_key`(`driverId`, `locationName`),
    INDEX `DriverLocation_locationName_idx`(`locationName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverPayoutAccount` (
    `id` VARCHAR(36) NOT NULL,
    `driverId` VARCHAR(36) NOT NULL,
    `provider` VARCHAR(100) NOT NULL,
    `accountHolder` VARCHAR(150) NOT NULL,
    `accountPhone` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DriverPayoutAccount_driverId_idx`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryRoute` (
    `id` VARCHAR(36) NOT NULL,
    `driverId` VARCHAR(36) NOT NULL,
    `routeDate` DATE NOT NULL,
    `status` ENUM('PICKED_UP', 'IN_TRANSIT', 'DELIVERED') NOT NULL DEFAULT 'PICKED_UP',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DeliveryRoute_driverId_routeDate_idx`(`driverId`, `routeDate`),
    INDEX `DeliveryRoute_status_routeDate_idx`(`status`, `routeDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProofOfDelivery` (
    `id` VARCHAR(36) NOT NULL,
    `orderId` VARCHAR(36) NOT NULL,
    `routeId` VARCHAR(36) NOT NULL,
    `deliveredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recipientName` VARCHAR(200) NULL,
    `signatureUrl` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `ProofOfDelivery_orderId_key`(`orderId`),
    INDEX `ProofOfDelivery_routeId_deliveredAt_idx`(`routeId`, `deliveredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(36) NOT NULL,
    `orderNumber` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(36) NOT NULL,
    `shippingAddressId` VARCHAR(36) NULL,
    `billingAddressId` VARCHAR(36) NULL,
    `routeId` VARCHAR(36) NULL,
    `status` ENUM('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `deliveryStatus` ENUM('PICKED_UP', 'IN_TRANSIT', 'DELIVERED') NULL,
    `currency` ENUM('RWF', 'USD', 'EUR', 'GBP', 'CAD', 'KES', 'UGX', 'TZS', 'BIF', 'NGN', 'GHS', 'ZAR') NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `shippingTotal` DECIMAL(12, 2) NOT NULL,
    `taxTotal` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `placedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `Order_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Order_routeId_deliveryStatus_idx`(`routeId`, `deliveryStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(36) NOT NULL,
    `orderId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `productName` VARCHAR(200) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,

    INDEX `OrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(36) NOT NULL,
    `orderId` VARCHAR(36) NOT NULL,
    `gateway` ENUM('MTN_MOMO', 'AIRTEL_MONEY', 'MPESA', 'FLUTTERWAVE', 'PAYSTACK', 'LOCAL_CARD', 'STRIPE', 'PAYPAL', 'CASH_ON_DELIVERY', 'MANUAL') NOT NULL,
    `gatewayTransactionId` VARCHAR(200) NULL,
    `status` ENUM('INITIATED', 'PENDING_APPROVAL', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `paymentMethod` VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    `currency` ENUM('RWF', 'USD', 'EUR', 'GBP', 'CAD', 'KES', 'UGX', 'TZS', 'BIF', 'NGN', 'GHS', 'ZAR') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Payment_gatewayTransactionId_key`(`gatewayTransactionId`),
    INDEX `Payment_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `Payment_gateway_createdAt_idx`(`gateway`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(36) NOT NULL,
    `actorId` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `ipAddress` VARCHAR(64) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,

    INDEX `AuditLog_actorId_timestamp_idx`(`actorId`, `timestamp`),
    INDEX `AuditLog_entityType_entityId_timestamp_idx`(`entityType`, `entityId`, `timestamp`),
    INDEX `AuditLog_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `portal` VARCHAR(32) NOT NULL,
    `authMethod` VARCHAR(32) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL,

    INDEX `Session_userId_revokedAt_expiresAt_idx`(`userId`, `revokedAt`, `expiresAt`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthChallenge` (
    `id` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuthChallenge_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `tokenHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasswordResetToken_userId_idx`(`userId`),
    INDEX `PasswordResetToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`tokenHash`),
    CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthRateLimit` (
    `id` CHAR(64) NOT NULL,
    `windowStartedAt` DATETIME(3) NOT NULL,
    `requestCount` INT UNSIGNED NOT NULL DEFAULT 0,

    INDEX `AuthRateLimit_windowStartedAt_idx`(`windowStartedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_contributorId_fkey` FOREIGN KEY (`contributorId`) REFERENCES `Contributor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contributor` ADD CONSTRAINT `Contributor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContributorSubmission` ADD CONSTRAINT `ContributorSubmission_contributorId_fkey` FOREIGN KEY (`contributorId`) REFERENCES `Contributor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContributorSubmission` ADD CONSTRAINT `ContributorSubmission_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContributorSubmission` ADD CONSTRAINT `ContributorSubmission_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Driver` ADD CONSTRAINT `Driver_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DriverLocation` ADD CONSTRAINT `DriverLocation_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DriverPayoutAccount` ADD CONSTRAINT `DriverPayoutAccount_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryRoute` ADD CONSTRAINT `DeliveryRoute_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProofOfDelivery` ADD CONSTRAINT `ProofOfDelivery_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProofOfDelivery` ADD CONSTRAINT `ProofOfDelivery_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `DeliveryRoute`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_shippingAddressId_fkey` FOREIGN KEY (`shippingAddressId`) REFERENCES `Address`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_billingAddressId_fkey` FOREIGN KEY (`billingAddressId`) REFERENCES `Address`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `DeliveryRoute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminUser`
  ADD COLUMN `roleId` VARCHAR(36) NULL,
  ADD INDEX `AdminUser_roleId_idx` (`roleId`);

ALTER TABLE `User`
  ADD COLUMN `profileImageUrl` VARCHAR(191) NULL;

ALTER TABLE `Product`
  MODIFY COLUMN `description` TEXT NULL;

CREATE TABLE `AdminRole` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `description` VARCHAR(191) NULL,
  `permissions` TEXT NOT NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `AdminRole_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FinanceTransaction` (
  `id` VARCHAR(36) NOT NULL,
  `adminId` VARCHAR(36) NOT NULL,
  `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` VARCHAR(1000) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `transactionDate` DATE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `FinanceTransaction_adminId_transactionDate_idx` (`adminId`, `transactionDate`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FinanceTransaction_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PartnerAdminMessage` (
  `id` VARCHAR(36) NOT NULL,
  `contributorId` VARCHAR(36) NOT NULL,
    `senderAdminId` VARCHAR(36) NULL,
    `senderUserId` VARCHAR(36) NULL,
    `messageType` ENUM('MESSAGE', 'REPORT') NOT NULL DEFAULT 'MESSAGE',
  `body` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(512) NULL,
    `attachmentName` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `PartnerAdminMessage_contributorId_createdAt_idx` (`contributorId`, `createdAt`),
    INDEX `PartnerAdminMessage_senderUserId_idx` (`senderUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemSetting` (
    `settingKey` VARCHAR(100) NOT NULL,
    `value` VARCHAR(512) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`settingKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`)
SELECT UUID(), 'Super admin', 'Full access to all administration features.', '["catalog:read","catalog:write","orders:read","orders:write","partners:read","partners:review","users:manage","audit:read"]', 1
WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Super admin');

INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`)
SELECT UUID(), 'Catalog manager', 'Manage products and inventory.', '["catalog:read","catalog:write"]', 1
WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Catalog manager');

INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`)
SELECT UUID(), 'Fulfillment manager', 'Review and process customer orders.', '["orders:read","orders:write"]', 1
WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Fulfillment manager');

INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`)
SELECT UUID(), 'Partner manager', 'Review partner applications and send messages.', '["partners:read","partners:review"]', 1
WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Partner manager');

INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`)
SELECT UUID(), 'Read-only administrator', 'View dashboards and audit history.', '["catalog:read","orders:read","partners:read","audit:read"]', 1
WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Read-only administrator');

INSERT INTO `AdminRole` (`id`, `name`, `description`, `permissions`, `isSystem`)
SELECT UUID(), 'Accountant', 'Record and report income and expenses. Finance records are private to their creator.', '["finance:read","finance:write"]', 1
WHERE NOT EXISTS (SELECT 1 FROM `AdminRole` WHERE `name` = 'Accountant');

UPDATE `AdminUser` AS admin
JOIN `AdminRole` AS role ON role.name = IF(admin.isSuperAdmin = 1, 'Super admin', 'Read-only administrator')
SET admin.roleId = role.id
WHERE admin.roleId IS NULL;
-- Starter category and catalog data in Rwandan francs.
INSERT INTO `Category` (`id`, `name`, `createdAt`) VALUES
(UUID(), 'Fruit', NOW(3)),
(UUID(), 'Vegetables', NOW(3)),
(UUID(), 'Roots & tubers', NOW(3)),
(UUID(), 'Beans & peas', NOW(3));

INSERT INTO `Product` (`id`, `name`, `description`, `imagePath`, `retailPrice`, `currency`, `isActive`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'Garden tomatoes', 'Ripe, sun-grown tomatoes from independent organic contributors.', '/products/inyanya.jpg', 4500, 'RWF', 1, NOW(3), NOW(3)),
(UUID(), 'Creamy avocados', 'Fresh avocados selected at the right stage for a creamy finish.', '/products/avoka.jpg', 6000, 'RWF', 1, NOW(3), NOW(3)),
(UUID(), 'Green garden peas', 'Tender peas harvested from small-scale organic farms.', '/products/amashaza.jpg', 3800, 'RWF', 1, NOW(3), NOW(3)),
(UUID(), 'Harvest potatoes', 'Earthy, versatile potatoes grown in healthy soil.', '/products/ibirayi.jpg', 2600, 'RWF', 1, NOW(3), NOW(3)),
(UUID(), 'Sweet carrots', 'Crunchy carrots from the season''s local harvest.', '/products/karoti.jpg', 3400, 'RWF', 1, NOW(3), NOW(3)),
(UUID(), 'Golden pineapples', 'Fragrant, naturally sweet pineapples picked when ripe.', '/products/inanasi.jpg', 5100, 'RWF', 1, NOW(3), NOW(3));

INSERT INTO `ProductCategory` (`productId`, `categoryId`)
SELECT p.`id`, c.`id`
FROM `Product` p
JOIN `Category` c ON c.`name` = CASE p.`name`
    WHEN 'Garden tomatoes' THEN 'Vegetables'
    WHEN 'Creamy avocados' THEN 'Fruit'
    WHEN 'Green garden peas' THEN 'Beans & peas'
    WHEN 'Harvest potatoes' THEN 'Roots & tubers'
    WHEN 'Sweet carrots' THEN 'Roots & tubers'
    WHEN 'Golden pineapples' THEN 'Fruit'
END
WHERE p.`name` IN ('Garden tomatoes', 'Creamy avocados', 'Green garden peas', 'Harvest potatoes', 'Sweet carrots', 'Golden pineapples');

INSERT INTO `InventoryItem` (`id`, `productId`, `source`, `quantity`, `warehouseCode`, `createdAt`, `updatedAt`)
SELECT UUID(), p.`id`, 'INTERNAL', CASE p.`name`
    WHEN 'Garden tomatoes' THEN 40
    WHEN 'Creamy avocados' THEN 28
    WHEN 'Green garden peas' THEN 32
    WHEN 'Harvest potatoes' THEN 55
    WHEN 'Sweet carrots' THEN 36
    WHEN 'Golden pineapples' THEN 24
END, 'MAIN', NOW(3), NOW(3)
FROM `Product` p
WHERE p.`name` IN ('Garden tomatoes', 'Creamy avocados', 'Green garden peas', 'Harvest potatoes', 'Sweet carrots', 'Golden pineapples');

-- Bootstrap the first admin separately with ADMIN_USERNAME and ADMIN_PASSWORD via npm run db:seed.

-- Prevent the app migration runner from trying to reapply this imported schema.
CREATE TABLE IF NOT EXISTS `_pb_migrations` (`name` VARCHAR(255) NOT NULL PRIMARY KEY, `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3));
INSERT INTO `_pb_migrations` (`name`) VALUES ('database_pb.sql') ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);