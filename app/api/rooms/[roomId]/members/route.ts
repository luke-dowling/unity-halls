import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAccess, countActivePlayerRooms, nextAvailableSeat, MAX_PLAYER_ROOMS } from "@/lib/rooms";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
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

  const memberships = await prisma.roomMembership.findMany({
    where: { roomId, status: { in: ["ACTIVE", "PENDING"] } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(memberships);
}

const patchSchema = z.object({
  membershipId: z.string().min(1),
  action: z.enum(["approve", "deny", "kick"]),
});

export async function PATCH(
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const membership = await prisma.roomMembership.findUnique({
    where: { id: parsed.data.membershipId },
  });
  if (!membership || membership.roomId !== roomId) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    if (membership.status !== "PENDING") {
      return NextResponse.json({ error: "Membership is not pending" }, { status: 409 });
    }
    const activeCount = await countActivePlayerRooms(membership.userId);
    if (activeCount >= MAX_PLAYER_ROOMS) {
      return NextResponse.json({ error: "Player is already in the maximum number of games" }, { status: 409 });
    }
    const activeSeats = await prisma.roomMembership.findMany({
      where: { roomId, status: "ACTIVE" },
      select: { seatIndex: true },
    });
    const seat = nextAvailableSeat(activeSeats.map((m) => m.seatIndex));
    if (seat === null) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }
    const updated = await prisma.roomMembership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE", seatIndex: seat, joinedAt: new Date(), requestedAt: null, leftAt: null },
    });
    return NextResponse.json(updated);
  }

  if (parsed.data.action === "deny") {
    if (membership.status !== "PENDING") {
      return NextResponse.json({ error: "Membership is not pending" }, { status: 409 });
    }
    const updated = await prisma.roomMembership.update({
      where: { id: membership.id },
      data: { status: "LEFT", requestedAt: null },
    });
    return NextResponse.json(updated);
  }

  // kick
  if (membership.status !== "ACTIVE") {
    return NextResponse.json({ error: "Membership is not active" }, { status: 409 });
  }
  const updated = await prisma.roomMembership.update({
    where: { id: membership.id },
    data: { status: "LEFT", seatIndex: null, leftAt: new Date() },
  });
  return NextResponse.json(updated);
}
