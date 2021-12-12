/*
  Warnings:

  - Added the required column `name` to the `Calendar` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `calendar` ADD COLUMN `name` VARCHAR(191) NOT NULL;
