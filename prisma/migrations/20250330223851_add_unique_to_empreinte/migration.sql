/*
  Warnings:

  - A unique constraint covering the columns `[empreinte]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.
  - Made the column `empreinte` on table `Agent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "empreinte" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agent_empreinte_key" ON "Agent"("empreinte");
ALTER TABLE "Ronde"
ADD COLUMN "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
