import { auth } from "@/actions/auth";
import { getDailyRoom, createDailyToken } from "@/actions/daily";
import { prisma } from "@/actions/prisma";
import { FREE_TIER_WEEKLY_LIMIT_HOURS, getRoomAccess, getRoomWeeklyUsageSeconds } from "@/actions/rooms";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roomId = new URL(req.url).searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const { room, isOwner, membership } = await getRoomAccess(roomId, session.user.id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!isOwner && membership?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only gate on starting a new session — if the room is already live,
  // that session already passed this check, so let the owner rejoin it.
  if (isOwner && !room.isLive) {
    const owner = await prisma.user.findUnique({
      where: { id: room.ownerId },
      select: { planTier: true },
    });

    if (owner?.planTier !== "PAID") {
      const usedSeconds = await getRoomWeeklyUsageSeconds(roomId);
      if (usedSeconds >= FREE_TIER_WEEKLY_LIMIT_HOURS * 3600) {
        return NextResponse.json(
          { error: "Weekly session limit reached for this room" },
          { status: 403 }
        );
      }
    }
  }

  try {
    const dailyRoom = await getDailyRoom(roomId);
    const userName = membership?.characterName ?? session.user.name;
    const token = await createDailyToken(dailyRoom.name, userName, isOwner);
    return NextResponse.json({ token, url: dailyRoom.url });
  } catch (err) {
    console.error("[daily/token]", err);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
