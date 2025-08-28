/*
  Warnings:

  - You are about to drop the column `orderId` on the `reservation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `reservation` DROP FOREIGN KEY `Reservation_orderId_fkey`;

-- DropIndex
DROP INDEX `Order_reservationId_key` ON `order`;

-- DropIndex
DROP INDEX `Reservation_orderId_key` ON `reservation`;

-- AlterTable
ALTER TABLE `order` MODIFY `paymentStatus` VARCHAR(191) NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `reservation` DROP COLUMN `orderId`;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
