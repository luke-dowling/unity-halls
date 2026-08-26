import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { getRoomAccess } from "@/actions/rooms";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().min(1).max(500),
  characterName: z.string().max(80).optional(),
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const { room, isOwner, membership } = await getRoomAccess(roomId, session.user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!isOwner && membership?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    select: { id: true, characterName: true, shadowColor: true, content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const { room, isOwner, membership } = await getRoomAccess(roomId, session.user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!isOwner && membership?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { content, characterName, shadowColor } = parsed.data;

  const message = await prisma.chatMessage.create({
    data: {
      userId: session.user.id,
      roomId,
      content,
      characterName: characterName ?? membership?.characterName ?? null,
      shadowColor: shadowColor ?? membership?.shadowColor ?? null,
    },
    select: { id: true, characterName: true, shadowColor: true, content: true, createdAt: true },
  });

  return NextResponse.json(message, { status: 201 });
}
