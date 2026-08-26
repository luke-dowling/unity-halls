import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { getRoomAccess } from "@/actions/rooms";
import { NextResponse } from "next/server";

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

  const state = await prisma.room.findUnique({
    where: { id: roomId },
    select: { isLive: true },
  });

  return NextResponse.json({ isLive: state?.isLive ?? false });
}
