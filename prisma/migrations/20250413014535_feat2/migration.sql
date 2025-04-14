-- AlterTable
ALTER TABLE "Presence" ADD COLUMN     "justifiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "raison_justification" VARCHAR(255);

-- AlterTable
ALTER TABLE "Ronde" ADD COLUMN     "favori" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);
