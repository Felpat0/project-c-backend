-- AlterTable
ALTER TABLE `user` ADD COLUMN `passwordResetCode` VARCHAR(191),
    ADD COLUMN `passwordResetExpireDate` DATETIME(3);
