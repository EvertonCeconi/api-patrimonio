/*
  Warnings:

  - You are about to drop the column `localizacaoId` on the `equipments` table. All the data in the column will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `localizacao` to the `equipments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "equipments" DROP CONSTRAINT "equipments_localizacaoId_fkey";

-- AlterTable
ALTER TABLE "equipments" DROP COLUMN "localizacaoId",
ADD COLUMN     "localizacao" TEXT NOT NULL;

-- DropTable
DROP TABLE "locations";
