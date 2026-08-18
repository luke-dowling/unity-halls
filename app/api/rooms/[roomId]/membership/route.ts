import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { getRoomAccess } from "@/lib/rooms";
import { NextResponse } from "next/server";
import { z } from "zod";

// Player requests to rejoin a room they previously left — creates a
// PENDING membership for the room owner to approve/deny.
export async function POST(
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
  if (isOwner) {
    return NextResponse.json({ error: "You own this room" }, { status: 400 });
  }
  if (!membership || membership.status !== "LEFT") {
    return NextResponse.json({ error: "No previous membership to rejoin" }, { status: 409 });
  }

  const updated = await prisma.roomMembership.update({
    where: { id: membership.id },
    data: { status: "PENDING", requestedAt: new Date() },
  });

  return NextResponse.json(updated);
}

// Player leaves a room they're currently active in.
export async function DELETE(
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
  if (isOwner) {
    return NextResponse.json({ error: "You own this room" }, { status: 400 });
  }
  if (!membership || membership.status !== "ACTIVE") {
    return NextResponse.json({ error: "Not an active member of this room" }, { status: 409 });
  }

  const updated = await prisma.roomMembership.update({
    where: { id: membership.id },
    data: { status: "LEFT", seatIndex: null, leftAt: new Date() },
  });

  return NextResponse.json(updated);
}

const customizeSchema = z.object({
  characterName: z.string().min(1).max(80).optional(),
  playerClass: z.enum(["CLERIC", "RANGER", "BLOOD_HUNTER", "PALADIN", "SORCERER"]).optional(),
  portraitId: z.string().min(1).max(100).optional(),
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  portraitUrl: z.string().url().or(z.literal("")).optional(),
});

// Edit your own character/persona for this room — the room owner's
// persona lives on the Room record itself, everyone else's on their
// RoomMembership row.
export async function PUT(
  req: Request,
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
  if (!isOwner && !membership) {
    return NextResponse.json({ error: "Not a member of this room" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = customizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  if (isOwner) {
    const data: Record<string, unknown> = {};
    if (parsed.data.characterName !== undefined) data.ownerCharacterName = parsed.data.characterName;
    if (parsed.data.shadowColor !== undefined) data.ownerShadowColor = parsed.data.shadowColor;
    if (parsed.data.portraitUrl !== undefined) data.ownerPortraitUrl = parsed.data.portraitUrl || null;

    const oldPortraitUrl = room.ownerPortraitUrl;
    const updated = await prisma.room.update({ where: { id: roomId }, data });

    if (parsed.data.portraitUrl !== undefined && oldPortraitUrl && oldPortraitUrl !== updated.ownerPortraitUrl) {
      await deleteCloudinaryAsset(oldPortraitUrl);
    }

    return NextResponse.json({
      characterName: updated.ownerCharacterName,
      shadowColor: updated.ownerShadowColor,
      portraitUrl: updated.ownerPortraitUrl,
    });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.characterName !== undefined) data.characterName = parsed.data.characterName;
  if (parsed.data.playerClass !== undefined) data.playerClass = parsed.data.playerClass;
  if (parsed.data.portraitId !== undefined) data.portraitId = parsed.data.portraitId;
  if (parsed.data.shadowColor !== undefined) data.shadowColor = parsed.data.shadowColor;
  if (parsed.data.portraitUrl !== undefined) data.portraitUrl = parsed.data.portraitUrl || null;

  const oldPortraitUrl = membership!.portraitUrl;

  const updated = await prisma.roomMembership.update({
    where: { id: membership!.id },
    data,
  });

  if (parsed.data.portraitUrl !== undefined && oldPortraitUrl && oldPortraitUrl !== updated.portraitUrl) {
    await deleteCloudinaryAsset(oldPortraitUrl);
  }

  return NextResponse.json(updated);
}
