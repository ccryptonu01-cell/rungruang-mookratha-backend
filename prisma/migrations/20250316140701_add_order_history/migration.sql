/*
  Warnings:

  - You are about to drop the column `createdAt` on the `orderhistory` table. All the data in the column will be lost.
  - Added the required column `day` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orderhistory` DROP COLUMN `createdAt`,
    ADD COLUMN `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `day` INTEGER NOT NULL,
    ADD COLUMN `month` INTEGER NOT NULL,
    ADD COLUMN `tableId` INTEGER NULL,
    ADD COLUMN `totalPrice` DECIMAL(65, 30) NOT NULL,
    ADD COLUMN `year` INTEGER NOT NULL;
