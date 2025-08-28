/*
  Warnings:

  - Added the required column `paymentMethod` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orderhistory` ADD COLUMN `paymentMethod` VARCHAR(191) NOT NULL;
