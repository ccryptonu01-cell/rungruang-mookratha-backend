/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `GuestUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `GuestUser_phone_key` ON `GuestUser`(`phone`);
