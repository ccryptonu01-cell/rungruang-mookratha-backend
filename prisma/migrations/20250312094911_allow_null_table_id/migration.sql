-- DropForeignKey
ALTER TABLE `reservation` DROP FOREIGN KEY `Reservation_tableId_fkey`;

-- DropIndex
DROP INDEX `Reservation_tableId_fkey` ON `reservation`;

-- AlterTable
ALTER TABLE `reservation` MODIFY `tableId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
