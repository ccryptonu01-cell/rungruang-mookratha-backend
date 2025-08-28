/*
  Warnings:

  - You are about to drop the column `menuId` on the `inventory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `inventory` DROP FOREIGN KEY `Inventory_menuId_fkey`;

-- DropIndex
DROP INDEX `Inventory_menuId_fkey` ON `inventory`;

-- AlterTable
ALTER TABLE `inventory` DROP COLUMN `menuId`;
