import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { omitInviteToken } from "@/actions/rooms";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ownedRoom, memberships] = await Promise.all([
    prisma.room.findFirst({ where: { ownerId: session.user.id } }),
    prisma.roomMembership.findMany({
      where: { userId: session.user.id },
      include: { room: { include: { owner: { select: { name: true } } } } },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const pendingCount = ownedRoom
    ? await prisma.roomMembership.count({ where: { roomId: ownedRoom.id, status: "PENDING" } })
    : 0;

  // A membership's room is never one the caller owns, so strip the
  // owner-only inviteToken before returning these rooms to the player.
  function withSafeRoom(m: (typeof memberships)[number]) {
    return { ...m, room: omitInviteToken(m.room) };
  }

  return NextResponse.json({
    ownedRoom: ownedRoom ? { ...ownedRoom, pendingCount } : null,
    active: memberships.filter((m) => m.status === "ACTIVE").map(withSafeRoom),
    pending: memberships.filter((m) => m.status === "PENDING").map(withSafeRoom),
    left: memberships.filter((m) => m.status === "LEFT").map(withSafeRoom),
  });
}
