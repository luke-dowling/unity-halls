import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { getRoomAccess } from "@/actions/rooms";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  soundtrackId: z.string().min(1).max(50).nullable().optional(),
}).refine((d) => d.backgroundColor !== undefined || d.soundtrackId !== undefined, {
  message: "At least one of backgroundColor or soundtrackId is required",
});

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
    include: { soundtrack: true },
  });

  return NextResponse.json(state);
}

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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  if (parsed.data.soundtrackId) {
    const soundtrack = await prisma.soundtrack.findUnique({ where: { id: parsed.data.soundtrackId } });
    if (!soundtrack) {
      return NextResponse.json({ error: "Soundtrack not found" }, { status: 404 });
    }
  }

  const state = await prisma.room.update({
    where: { id: roomId },
    data: parsed.data,
    include: { soundtrack: true },
  });

  return NextResponse.json(state);
}
