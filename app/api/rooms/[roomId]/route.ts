import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { getRoomAccess, omitInviteToken } from "@/actions/rooms";
import { NextResponse } from "next/server";

const TRACKS_INCLUDE = {
  tracks: {
    include: { track: true },
    orderBy: { position: "asc" as const },
  },
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const { room, isOwner, membership } = await getRoomAccess(roomId, session.user.id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!isOwner && membership?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const full = await prisma.room.findUnique({
    where: { id: roomId },
    include: { soundtrack: { include: TRACKS_INCLUDE }, owner: { select: { id: true, name: true } } },
  });

  if (!isOwner && full) {
    return NextResponse.json({ ...omitInviteToken(full), isOwner });
  }

  return NextResponse.json({ ...full, isOwner });
}
