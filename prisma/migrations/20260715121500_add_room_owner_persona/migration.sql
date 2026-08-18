-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "ownerCharacterName" TEXT,
ADD COLUMN     "ownerPortraitUrl" TEXT,
ADD COLUMN     "ownerShadowColor" TEXT NOT NULL DEFAULT '#f59e0b';
