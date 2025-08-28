/*
  Warnings:

  - You are about to drop the column `reservationId` on the `order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_reservationId_fkey`;

-- DropIndex
DROP INDEX `Order_reservationId_fkey` ON `order`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `reservationId`;

-- AlterTable
ALTER TABLE `reservation` ADD COLUMN `orderId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Reservation_orderId_key` ON `Reservation`(`orderId`);

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
