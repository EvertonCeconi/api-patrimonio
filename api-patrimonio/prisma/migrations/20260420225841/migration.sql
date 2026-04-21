/*
  Warnings:

  - Made the column `assetTag` on table `equipments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `serialNumber` on table `equipments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "equipments" ALTER COLUMN "assetTag" SET NOT NULL,
ALTER COLUMN "serialNumber" SET NOT NULL;
