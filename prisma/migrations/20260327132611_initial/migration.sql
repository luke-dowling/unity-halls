-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DM', 'PLAYER');

-- CreateEnum
CREATE TYPE "PlayerClass" AS ENUM ('CLERIC', 'RANGER', 'BLOOD_HUNTER', 'PALADIN', 'SORCERER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "characterName" TEXT,
    "playerClass" "PlayerClass",
    "seatIndex" INTEGER,
    "portraitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "backgroundUrl" TEXT NOT NULL,
    "musicUrls" TEXT[],

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomState" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "themeId" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_seatIndex_key" ON "User"("seatIndex");

-- AddForeignKey
ALTER TABLE "RoomState" ADD CONSTRAINT "RoomState_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
