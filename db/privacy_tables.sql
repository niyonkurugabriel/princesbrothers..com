-- Princess & Brothers privacy and consent records.
-- user_id references the application's UUID-based `User` table.
CREATE TABLE IF NOT EXISTS `consent_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` TEXT NULL,
    `consent_type` ENUM('ALL', 'NECESSARY_ONLY', 'CUSTOM') NOT NULL,
    `geolocation_country` VARCHAR(100) NULL,
    `preferences` JSON NOT NULL,
    `policy_version` VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `consent_logs_user_created_idx` (`user_id`, `created_at`),
    INDEX `consent_logs_created_idx` (`created_at`),
    CONSTRAINT `consent_logs_user_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_rights_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(255) NOT NULL,
    `contact_email` VARCHAR(255) NULL,
    `contact_phone` VARCHAR(32) NULL,
    `portal_role` ENUM('CUSTOMER', 'CONTRIBUTOR', 'DRIVER', 'GUEST') NOT NULL,
    `request_type` ENUM('ACCESS', 'RECTIFICATION', 'ERASURE', 'CONSENT_WITHDRAWAL') NOT NULL,
    `request_details` TEXT NULL,
    `status` ENUM('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `data_rights_requests_status_created_idx` (`status`, `created_at`),
    INDEX `data_rights_requests_email_idx` (`contact_email`),
    INDEX `data_rights_requests_phone_idx` (`contact_phone`),
    CONSTRAINT `data_rights_requests_contact_check` CHECK ((`contact_email` IS NULL) <> (`contact_phone` IS NULL))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
