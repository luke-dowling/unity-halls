import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { FREE_TIER_WEEKLY_LIMIT_HOURS, getRoomAccess, getRoomWeeklyUsageSeconds } from "@/actions/rooms";
import { NextResponse } from "next/server";
import { z } from "zod";

const liveSchema = z.object({
  isLive: z.boolean(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const { room, isOwner } = await getRoomAccess(roomId, session.user.id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = liveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  if (parsed.data.isLive) {
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

    // Guard against a dangling open session (e.g. a prior toggle whose
    // "end" call never landed) before starting a new one.
    await prisma.roomSession.updateMany({
      where: { roomId, endedAt: null },
      data: { endedAt: new Date() },
    });
    await prisma.roomSession.create({ data: { roomId } });
  } else {
    await prisma.roomSession.updateMany({
      where: { roomId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { isLive: parsed.data.isLive },
  });

  return NextResponse.json({ isLive: updated.isLive });
}
