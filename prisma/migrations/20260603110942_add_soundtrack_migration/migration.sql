/*
  Warnings:

  - You are about to drop the column `themeId` on the `RoomState` table. All the data in the column will be lost.
  - You are about to drop the `Theme` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('BACKGROUND', 'SOUNDTRACK');

-- DropForeignKey
ALTER TABLE "RoomState" DROP CONSTRAINT "RoomState_themeId_fkey";

-- AlterTable
ALTER TABLE "RoomState" DROP COLUMN "themeId",
ADD COLUMN     "backgroundId" TEXT,
ADD COLUMN     "soundtrackId" TEXT;

-- DropTable
DROP TABLE "Theme";

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FolderType" NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Background" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "backgroundUrl" TEXT NOT NULL,

    CONSTRAINT "Background_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoundtrackTrack" (
    "id" TEXT NOT NULL,
    "soundtrackId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SoundtrackTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Soundtrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Soundtrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SoundtrackFolders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SoundtrackFolders_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BackgroundFolders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BackgroundFolders_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoundtrackTrack_soundtrackId_trackId_key" ON "SoundtrackTrack"("soundtrackId", "trackId");

-- CreateIndex
CREATE INDEX "_SoundtrackFolders_B_index" ON "_SoundtrackFolders"("B");

-- CreateIndex
CREATE INDEX "_BackgroundFolders_B_index" ON "_BackgroundFolders"("B");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoundtrackTrack" ADD CONSTRAINT "SoundtrackTrack_soundtrackId_fkey" FOREIGN KEY ("soundtrackId") REFERENCES "Soundtrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoundtrackTrack" ADD CONSTRAINT "SoundtrackTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomState" ADD CONSTRAINT "RoomState_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomState" ADD CONSTRAINT "RoomState_soundtrackId_fkey" FOREIGN KEY ("soundtrackId") REFERENCES "Soundtrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SoundtrackFolders" ADD CONSTRAINT "_SoundtrackFolders_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SoundtrackFolders" ADD CONSTRAINT "_SoundtrackFolders_B_fkey" FOREIGN KEY ("B") REFERENCES "Soundtrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BackgroundFolders" ADD CONSTRAINT "_BackgroundFolders_A_fkey" FOREIGN KEY ("A") REFERENCES "Background"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BackgroundFolders" ADD CONSTRAINT "_BackgroundFolders_B_fkey" FOREIGN KEY ("B") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
