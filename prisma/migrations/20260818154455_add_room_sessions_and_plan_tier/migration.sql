-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planTier" "PlanTier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "RoomSession" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RoomSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomSession_roomId_startedAt_idx" ON "RoomSession"("roomId", "startedAt");

-- AddForeignKey
ALTER TABLE "RoomSession" ADD CONSTRAINT "RoomSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
