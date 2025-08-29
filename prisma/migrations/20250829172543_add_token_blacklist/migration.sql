/*
  Warnings:

  - You are about to alter the column `time` on the `reservation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(6)` to `DateTime(3)`.

*/
-- AlterTable
ALTER TABLE `reservation` MODIFY `time` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `TokenBlacklist` (
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
