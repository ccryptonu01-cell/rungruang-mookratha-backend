-- DropForeignKey
ALTER TABLE `inventory` DROP FOREIGN KEY `Inventory_menuId_fkey`;

-- DropIndex
DROP INDEX `Inventory_menuId_fkey` ON `inventory`;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
