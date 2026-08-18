-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'LEFT', 'PENDING');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL DEFAULT '#0c0a09',
    "soundtrackId" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "inviteToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "seatIndex" INTEGER,
    "characterName" TEXT,
    "playerClass" "PlayerClass",
    "portraitId" TEXT,
    "portraitUrl" TEXT,
    "shadowColor" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3),

    CONSTRAINT "RoomMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteToken_key" ON "Room"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMembership_userId_roomId_key" ON "RoomMembership"("userId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMembership_roomId_seatIndex_key" ON "RoomMembership"("roomId", "seatIndex");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_soundtrackId_fkey" FOREIGN KEY ("soundtrackId") REFERENCES "Soundtrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable (nullable for now — backfilled below, then tightened)
ALTER TABLE "ChatMessage" ADD COLUMN "roomId" TEXT;

-- ============================================================
-- Data backfill: preserve the existing single shared game as
-- the previous DM's Room, and give every account (including
-- former players) their own default owned Room going forward.
-- ============================================================

-- 1. Every existing user gets their own default owned Room.
INSERT INTO "Room" ("id", "name", "ownerId", "backgroundColor", "isLive", "inviteToken", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "name" || '''s Game', "id", '#0c0a09', false, gen_random_uuid()::text, now(), now()
FROM "User";

-- 2. Hydrate the previous DM's new Room with the old singleton
--    RoomState's live background/soundtrack/isLive.
UPDATE "Room" r
SET "backgroundColor" = rs."backgroundColor",
    "soundtrackId" = rs."soundtrackId",
    "isLive" = rs."isLive"
FROM "RoomState" rs, "User" dm
WHERE rs."id" = 'default'
  AND dm."role" = 'DM'
  AND r."ownerId" = dm."id";

-- 3. Re-home existing chat history under that same Room.
UPDATE "ChatMessage" cm
SET "roomId" = r."id"
FROM "Room" r, "User" dm
WHERE dm."role" = 'DM'
  AND r."ownerId" = dm."id";

-- 4. Carry over existing PLAYER accounts as ACTIVE members of that
--    DM's room, preserving their seat/character/portrait.
INSERT INTO "RoomMembership" ("id", "userId", "roomId", "status", "seatIndex", "characterName", "playerClass", "portraitId", "portraitUrl", "shadowColor", "joinedAt")
SELECT gen_random_uuid()::text, p."id", r."id", 'ACTIVE', p."seatIndex", p."characterName", p."playerClass", p."portraitId", p."portraitUrl", p."shadowColor", now()
FROM "User" p, "Room" r, "User" dm
WHERE p."role" = 'PLAYER'
  AND dm."role" = 'DM'
  AND r."ownerId" = dm."id";

-- ============================================================
-- End data backfill
-- ============================================================

ALTER TABLE "ChatMessage" ALTER COLUMN "roomId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_idx" ON "ChatMessage"("roomId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Now that everything is migrated onto Room/RoomMembership, drop the
-- old singleton/global columns.

-- DropForeignKey
ALTER TABLE "RoomState" DROP CONSTRAINT "RoomState_soundtrackId_fkey";

-- DropIndex
DROP INDEX "User_seatIndex_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "characterName",
DROP COLUMN "playerClass",
DROP COLUMN "portraitId",
DROP COLUMN "portraitUrl",
DROP COLUMN "role",
DROP COLUMN "seatIndex",
DROP COLUMN "shadowColor";

-- DropTable
DROP TABLE "RoomState";

-- DropEnum
DROP TYPE "Role";
