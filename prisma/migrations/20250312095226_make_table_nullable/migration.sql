/*
  Warnings:

  - Made the column `tableId` on table `reservation` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_tableId_fkey`;

-- DropForeignKey
ALTER TABLE `reservation` DROP FOREIGN KEY `Reservation_tableId_fkey`;

-- DropIndex
DROP INDEX `Order_tableId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Reservation_tableId_fkey` ON `reservation`;

-- AlterTable
ALTER TABLE `order` MODIFY `tableId` INTEGER NULL;

-- AlterTable
ALTER TABLE `reservation` MODIFY `tableId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
