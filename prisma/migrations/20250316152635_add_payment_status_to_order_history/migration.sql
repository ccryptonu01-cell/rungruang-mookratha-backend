/*
  Warnings:

  - Added the required column `paymentStatus` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orderhistory` ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL;
