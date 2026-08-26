import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { getRoomAccess } from "@/actions/rooms";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(
  _req: Request,
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

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { inviteToken: randomUUID() },
  });

  return NextResponse.json({ inviteToken: updated.inviteToken });
}
