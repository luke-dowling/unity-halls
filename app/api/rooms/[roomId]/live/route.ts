import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAccess } from "@/lib/rooms";
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

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { isLive: parsed.data.isLive },
  });

  return NextResponse.json({ isLive: updated.isLive });
}
