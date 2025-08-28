/*
  Warnings:

  - Added the required column `publicId` to the `Menu` table without a default value. This is not possible if the table is not empty.
  - Made the column `image` on table `menu` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `menu` ADD COLUMN `publicId` VARCHAR(191) NOT NULL,
    MODIFY `image` VARCHAR(191) NOT NULL;
